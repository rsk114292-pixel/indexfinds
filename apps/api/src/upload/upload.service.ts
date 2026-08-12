import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as fs from 'fs';
import { promises as fsPromises } from 'fs';
import * as os from 'os';
import * as crypto from 'crypto';
import { execFile as execFileCallback } from 'child_process';
import { promisify } from 'util';

const execFile = promisify(execFileCallback);
const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/x-icon',
  'image/vnd.microsoft.icon',
] as const;
const MAX_IMAGE_FILE_SIZE = 5 * 1024 * 1024;
const IMAGE_VALIDATION_LABEL = 'JPEG, PNG, WebP, GIF, ICO';
const IMAGE_EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/x-icon': '.ico',
  'image/vnd.microsoft.icon': '.ico',
};
const IMAGE_MIME_BY_EXTENSION: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
};

@Injectable()
export class UploadService {
  private uploadDir: string;
  private readonly logger = new Logger(UploadService.name);
  private ffmpegAvailable: boolean | null = null;
  private ffprobeAvailable: boolean | null = null;
  private qlmanageAvailable: boolean | null = null;
  private mdlsAvailable: boolean | null = null;

  constructor(private configService: ConfigService) {
    this.uploadDir = path.join(process.cwd(), 'uploads');

    // 确保上传目录存在
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  getFileUrl(filename: string): string {
    const baseUrl =
      this.configService.get<string>('API_URL') || 'http://localhost:4101';
    return `${baseUrl}/uploads/${filename}`;
  }

  validateImageFile(file: Express.Multer.File): boolean {
    if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype as any)) {
      throw new BadRequestException(
        `Only image files are allowed (${IMAGE_VALIDATION_LABEL})`,
      );
    }

    if (file.size > MAX_IMAGE_FILE_SIZE) {
      throw new BadRequestException('File size must be less than 5MB');
    }

    this.validateMagicBytes(file);

    return true;
  }

  async downloadRemoteImage(
    imageUrl: string,
    options?: { prefix?: string },
  ): Promise<string> {
    let parsedUrl: URL;

    try {
      parsedUrl = new URL(imageUrl);
    } catch {
      throw new BadRequestException('Invalid remote image URL');
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new BadRequestException('Only HTTP(S) image URLs are supported');
    }

    let response: Response;
    try {
      response = await fetch(parsedUrl.toString(), {
        headers: {
          Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0 Safari/537.36',
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(
        `Failed to download remote image: ${message}`,
      );
    }

    if (!response.ok) {
      throw new BadRequestException(
        `Remote image request failed with status ${response.status}`,
      );
    }

    const contentLengthHeader = response.headers.get('content-length');
    if (
      contentLengthHeader &&
      Number.parseInt(contentLengthHeader, 10) > MAX_IMAGE_FILE_SIZE
    ) {
      throw new BadRequestException('File size must be less than 5MB');
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const mimeType = this.resolveImageMimeType({
      buffer,
      headerMimeType: response.headers.get('content-type'),
      pathname: parsedUrl.pathname,
    });

    const ext =
      IMAGE_EXTENSIONS[mimeType] || path.extname(parsedUrl.pathname) || '.png';
    const filename = this.generateUploadedFilename(options?.prefix, ext);

    const file = {
      buffer,
      size: buffer.length,
      mimetype: mimeType,
      originalname: path.basename(parsedUrl.pathname) || filename,
      filename,
      path: path.join(this.uploadDir, filename),
    } as Express.Multer.File;

    if (buffer.length > MAX_IMAGE_FILE_SIZE) {
      throw new BadRequestException('File size must be less than 5MB');
    }

    this.validateImageFile(file);
    await fsPromises.writeFile(file.path, buffer);

    return this.getFileUrl(filename);
  }

  validateVideoFile(file: Express.Multer.File): boolean {
    const allowedMimeTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
    const maxSize = 50 * 1024 * 1024; // 50MB

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Only video files are allowed (MP4, WebM, MOV)',
      );
    }

    if (file.size > maxSize) {
      throw new BadRequestException('Video size must be less than 50MB');
    }

    this.validateVideoMagicBytes(file);

    return true;
  }

  async extractVideoMetadata(file: Express.Multer.File): Promise<{
    posterUrl: string | null;
    duration: number | null;
  }> {
    if (!file.path) {
      return { posterUrl: null, duration: null };
    }

    const [duration, posterFilename] = await Promise.all([
      this.extractVideoDuration(file.path),
      this.generateVideoPoster(file.path, file.filename),
    ]);

    return {
      posterUrl: posterFilename ? this.getFileUrl(posterFilename) : null,
      duration,
    };
  }

  private validateMagicBytes(file: Express.Multer.File): void {
    const buffer =
      file.buffer ?? (file.path ? fs.readFileSync(file.path) : null);
    if (!buffer || buffer.length < 4) {
      throw new BadRequestException(
        'Invalid file: unable to read file content',
      );
    }

    const magicBytes: Record<string, number[][]> = {
      'image/jpeg': [[0xff, 0xd8, 0xff]],
      'image/png': [[0x89, 0x50, 0x4e, 0x47]],
      'image/gif': [
        [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], // GIF87a
        [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], // GIF89a
      ],
      'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF header
      'image/x-icon': [[0x00, 0x00, 0x01, 0x00]],
      'image/vnd.microsoft.icon': [[0x00, 0x00, 0x01, 0x00]],
    };

    const signatures = magicBytes[file.mimetype];
    if (!signatures) {
      throw new BadRequestException('Unsupported file type');
    }

    const isValid = signatures.some((sig) =>
      sig.every((byte, i) => buffer[i] === byte),
    );

    if (!isValid) {
      throw new BadRequestException(
        'File content does not match declared MIME type',
      );
    }

    // WebP additional check: bytes 8-11 should be "WEBP"
    if (file.mimetype === 'image/webp') {
      const webpTag = buffer.slice(8, 12).toString('ascii');
      if (webpTag !== 'WEBP') {
        throw new BadRequestException(
          'File content does not match declared MIME type',
        );
      }
    }
  }

  private normalizeMimeType(value?: string | null): string {
    return (value || '').split(';')[0].trim().toLowerCase();
  }

  private detectMimeTypeFromBuffer(buffer: Buffer): string | null {
    if (buffer.length >= 4) {
      if (
        buffer[0] === 0x00 &&
        buffer[1] === 0x00 &&
        buffer[2] === 0x01 &&
        buffer[3] === 0x00
      ) {
        return 'image/x-icon';
      }
      if (
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47
      ) {
        return 'image/png';
      }
      if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
        return 'image/jpeg';
      }
      if (
        buffer[0] === 0x47 &&
        buffer[1] === 0x49 &&
        buffer[2] === 0x46 &&
        buffer[3] === 0x38
      ) {
        return 'image/gif';
      }
      if (
        buffer[0] === 0x52 &&
        buffer[1] === 0x49 &&
        buffer[2] === 0x46 &&
        buffer[3] === 0x46 &&
        buffer.length >= 12 &&
        buffer.slice(8, 12).toString('ascii') === 'WEBP'
      ) {
        return 'image/webp';
      }
    }

    return null;
  }

  private resolveImageMimeType(input: {
    buffer: Buffer;
    headerMimeType?: string | null;
    pathname?: string;
  }): string {
    const headerMimeType = this.normalizeMimeType(input.headerMimeType);
    const detectedMimeType = this.detectMimeTypeFromBuffer(input.buffer);
    const extensionMimeType =
      IMAGE_MIME_BY_EXTENSION[path.extname(input.pathname || '').toLowerCase()];

    if (
      headerMimeType &&
      ALLOWED_IMAGE_MIME_TYPES.includes(headerMimeType as any)
    ) {
      return detectedMimeType || extensionMimeType || headerMimeType;
    }

    if (
      headerMimeType === 'application/octet-stream' ||
      headerMimeType === 'binary/octet-stream' ||
      !headerMimeType
    ) {
      if (detectedMimeType) {
        return detectedMimeType;
      }
      if (extensionMimeType) {
        return extensionMimeType;
      }
    }

    if (detectedMimeType) {
      return detectedMimeType;
    }

    if (extensionMimeType) {
      return extensionMimeType;
    }

    return headerMimeType;
  }

  private generateUploadedFilename(prefix = 'upload', ext = '.png'): string {
    const safePrefix =
      prefix.replace(/[^a-z0-9_-]/gi, '').toLowerCase() || 'upload';
    const normalizedExt = ext.startsWith('.') ? ext : `.${ext}`;
    return `${safePrefix}-${crypto.randomBytes(16).toString('hex')}${normalizedExt}`;
  }

  private validateVideoMagicBytes(file: Express.Multer.File): void {
    const buffer =
      file.buffer ?? (file.path ? fs.readFileSync(file.path) : null);

    if (!buffer || buffer.length < 12) {
      throw new BadRequestException(
        'Invalid file: unable to read file content',
      );
    }

    if (file.mimetype === 'video/webm') {
      const webmSignature = [0x1a, 0x45, 0xdf, 0xa3];
      const isWebm = webmSignature.every(
        (byte, index) => buffer[index] === byte,
      );
      if (!isWebm) {
        throw new BadRequestException(
          'File content does not match declared MIME type',
        );
      }
      return;
    }

    const ftyp = buffer.slice(4, 8).toString('ascii');
    if (ftyp !== 'ftyp') {
      throw new BadRequestException(
        'File content does not match declared MIME type',
      );
    }
  }

  private async extractVideoDuration(filePath: string): Promise<number | null> {
    const ffprobeDuration = await this.extractDurationWithFfprobe(filePath);
    if (ffprobeDuration !== null) {
      return ffprobeDuration;
    }

    const mdlsDuration = await this.extractDurationWithMdls(filePath);
    if (mdlsDuration !== null) {
      return mdlsDuration;
    }

    return null;
  }

  private async generateVideoPoster(
    filePath: string,
    originalFilename: string,
  ): Promise<string | null> {
    const ffmpegPoster = await this.generatePosterWithFfmpeg(
      filePath,
      originalFilename,
    );
    if (ffmpegPoster) {
      return ffmpegPoster;
    }

    return this.generatePosterWithQuickLook(filePath, originalFilename);
  }

  private async ensureBinaryAvailable(
    binary: 'ffmpeg' | 'ffprobe' | 'qlmanage' | 'mdls',
  ): Promise<boolean> {
    const cacheKey = `${binary}Available` as const;
    if (this[cacheKey] !== null) {
      return this[cacheKey];
    }

    try {
      await execFile(binary, ['-version']);
      this[cacheKey] = true;
      return true;
    } catch {
      if (binary === 'qlmanage') {
        try {
          await execFile('qlmanage', ['-h']);
          this.qlmanageAvailable = true;
          return true;
        } catch {
          this.qlmanageAvailable = false;
          return false;
        }
      }

      if (binary === 'mdls') {
        try {
          await execFile('mdls', []);
        } catch (error) {
          // mdls 返回非 0 也表示命令存在，这里只检查 ENOENT
          const message =
            error instanceof Error ? error.message : String(error);
          if (!message.includes('ENOENT')) {
            this.mdlsAvailable = true;
            return true;
          }
        }
        this.mdlsAvailable = false;
        return false;
      }

      this[cacheKey] = false;
      return false;
    }
  }

  private async extractDurationWithFfprobe(
    filePath: string,
  ): Promise<number | null> {
    const available = await this.ensureBinaryAvailable('ffprobe');
    if (!available) return null;

    try {
      const { stdout } = await execFile('ffprobe', [
        '-v',
        'error',
        '-show_entries',
        'format=duration',
        '-of',
        'default=noprint_wrappers=1:nokey=1',
        filePath,
      ]);

      const duration = Number.parseFloat(stdout.trim());
      return Number.isFinite(duration) ? Number(duration.toFixed(2)) : null;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`ffprobe 提取视频时长失败: ${message}`);
      return null;
    }
  }

  private async extractDurationWithMdls(
    filePath: string,
  ): Promise<number | null> {
    if (process.platform !== 'darwin') return null;

    const available = await this.ensureBinaryAvailable('mdls');
    if (!available) return null;

    try {
      const { stdout } = await execFile('mdls', [
        '-raw',
        '-name',
        'kMDItemDurationSeconds',
        filePath,
      ]);

      const raw = stdout.trim();
      if (!raw || raw === '(null)') {
        return null;
      }

      const duration = Number.parseFloat(raw);
      return Number.isFinite(duration) ? Number(duration.toFixed(2)) : null;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`mdls 提取视频时长失败: ${message}`);
      return null;
    }
  }

  private async generatePosterWithFfmpeg(
    filePath: string,
    originalFilename: string,
  ): Promise<string | null> {
    const available = await this.ensureBinaryAvailable('ffmpeg');
    if (!available) return null;

    const posterFilename = `${path.parse(originalFilename).name}-poster.jpg`;
    const posterPath = path.join(this.uploadDir, posterFilename);

    try {
      await execFile('ffmpeg', [
        '-y',
        '-ss',
        '0.5',
        '-i',
        filePath,
        '-frames:v',
        '1',
        '-vf',
        'scale=960:-2:force_original_aspect_ratio=decrease',
        posterPath,
      ]);

      return posterFilename;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`ffmpeg 生成视频封面失败: ${message}`);
      return null;
    }
  }

  private async generatePosterWithQuickLook(
    filePath: string,
    originalFilename: string,
  ): Promise<string | null> {
    if (process.platform !== 'darwin') return null;

    const available = await this.ensureBinaryAvailable('qlmanage');
    if (!available) return null;

    const tempDir = await fsPromises.mkdtemp(
      path.join(os.tmpdir(), 'qc-video-poster-'),
    );
    const posterFilename = `${path.parse(originalFilename).name}-poster.png`;
    const finalPosterPath = path.join(this.uploadDir, posterFilename);

    try {
      await execFile('qlmanage', ['-t', '-s', '960', '-o', tempDir, filePath]);
      const generatedFiles = await fsPromises.readdir(tempDir);
      const posterSource = generatedFiles.find((name) => name.endsWith('.png'));

      if (!posterSource) {
        return null;
      }

      await fsPromises.rename(
        path.join(tempDir, posterSource),
        finalPosterPath,
      );

      return posterFilename;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Quick Look 生成视频封面失败: ${message}`);
      return null;
    } finally {
      await fsPromises.rm(tempDir, { recursive: true, force: true });
    }
  }
}
