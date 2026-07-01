import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as crypto from 'crypto';
import * as fs from 'fs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UploadService } from './upload.service';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/x-icon',
  'image/vnd.microsoft.icon',
];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_VIDEO_MIME_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const MAX_VIDEO_FILE_SIZE = 50 * 1024 * 1024; // 50MB

@ApiTags('Upload')
@Controller('upload')
@UseGuards(JwtAuthGuard)
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (_req, file, cb) => {
          const randomName = crypto.randomBytes(16).toString('hex');
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: (_req, file, cb) => {
        if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              'Only image files are allowed (JPEG, PNG, WebP, GIF, ICO)',
            ),
            false,
          );
        }
      },
    }),
  )
  uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    try {
      this.uploadService.validateImageFile(file);
    } catch (error) {
      // 验证失败时清理已写入磁盘的文件
      if (file.path) {
        fs.unlink(file.path, () => {});
      }
      throw error;
    }

    return {
      filename: file.filename,
      url: this.uploadService.getFileUrl(file.filename),
      size: file.size,
      mimetype: file.mimetype,
    };
  }

  @Post('image-from-url')
  async uploadImageFromUrl(@Body() body: { url?: string; prefix?: string }) {
    const remoteUrl = body?.url?.trim();
    if (!remoteUrl) {
      throw new BadRequestException('Image URL is required');
    }

    return {
      url: await this.uploadService.downloadRemoteImage(remoteUrl, {
        prefix: body?.prefix,
      }),
    };
  }

  @Post('video')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (_req, file, cb) => {
          const randomName = crypto.randomBytes(16).toString('hex');
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: MAX_VIDEO_FILE_SIZE },
      fileFilter: (_req, file, cb) => {
        if (ALLOWED_VIDEO_MIME_TYPES.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              'Only video files are allowed (MP4, WebM, MOV)',
            ),
            false,
          );
        }
      },
    }),
  )
  async uploadVideo(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    try {
      this.uploadService.validateVideoFile(file);
    } catch (error) {
      if (file.path) {
        fs.unlink(file.path, () => {});
      }
      throw error;
    }

    const metadata = await this.uploadService.extractVideoMetadata(file);

    return {
      filename: file.filename,
      url: this.uploadService.getFileUrl(file.filename),
      size: file.size,
      mimetype: file.mimetype,
      type: 'video',
      posterUrl: metadata.posterUrl,
      duration: metadata.duration,
    };
  }
}
