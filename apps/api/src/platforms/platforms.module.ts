import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Platform } from './entities/platform.entity';
import { PlatformsService } from './platforms.service';
import { PlatformsController } from './platforms.controller';
import { PlatformsPublicController } from './platforms-public.controller';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [TypeOrmModule.forFeature([Platform]), UploadModule],
  providers: [PlatformsService],
  controllers: [PlatformsController, PlatformsPublicController],
  exports: [PlatformsService],
})
export class PlatformsModule {}
