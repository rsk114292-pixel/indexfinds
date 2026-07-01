import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fsPromises } from 'fs';
import { UploadService } from './upload.service';

describe('UploadService', () => {
  let service: UploadService;
  let writeFileSpy: jest.SpyInstance;

  const toArrayBuffer = (buffer: Buffer) =>
    buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength,
    ) as ArrayBuffer;

  beforeEach(() => {
    const configService = {
      get: jest.fn().mockReturnValue('http://localhost:4101'),
    } as unknown as ConfigService;

    service = new UploadService(configService);
    writeFileSpy = jest.spyOn(fsPromises, 'writeFile').mockResolvedValue();
  });

  afterEach(() => {
    writeFileSpy.mockRestore();
    jest.restoreAllMocks();
  });

  it('downloads ico files reported as image/x-icon', async () => {
    const icoBuffer = Buffer.from([0x00, 0x00, 0x01, 0x00, 0x01, 0x00]);
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      headers: {
        get: (name: string) =>
          name === 'content-type' ? 'image/x-icon' : String(icoBuffer.length),
      },
      arrayBuffer: () => Promise.resolve(toArrayBuffer(icoBuffer)),
      status: 200,
    } as unknown as Response);

    const result = await service.downloadRemoteImage(
      'https://www.loongbuy.com/favicon.ico',
      { prefix: 'platform-loongbuy' },
    );

    expect(result).toMatch(
      /^http:\/\/localhost:4101\/uploads\/platform-loongbuy-[a-f0-9]+\.ico$/,
    );
    expect(fetchSpy).toHaveBeenCalled();
  });

  it('downloads ico files reported as application/octet-stream', async () => {
    const icoBuffer = Buffer.from([0x00, 0x00, 0x01, 0x00, 0x02, 0x00]);
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      headers: {
        get: (name: string) =>
          name === 'content-type'
            ? 'application/octet-stream'
            : String(icoBuffer.length),
      },
      arrayBuffer: () => Promise.resolve(toArrayBuffer(icoBuffer)),
      status: 200,
    } as unknown as Response);

    const result = await service.downloadRemoteImage(
      'https://www.usfans.com/favicon.ico',
      { prefix: 'platform-usfans' },
    );

    expect(result).toMatch(
      /^http:\/\/localhost:4101\/uploads\/platform-usfans-[a-f0-9]+\.ico$/,
    );
  });

  it('rejects unsupported remote file types', async () => {
    const textBuffer = Buffer.from('not-an-image');
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      headers: {
        get: (name: string) =>
          name === 'content-type' ? 'text/plain' : String(textBuffer.length),
      },
      arrayBuffer: () => Promise.resolve(toArrayBuffer(textBuffer)),
      status: 200,
    } as unknown as Response);

    await expect(
      service.downloadRemoteImage('https://example.com/file.txt', {
        prefix: 'platform-test',
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
