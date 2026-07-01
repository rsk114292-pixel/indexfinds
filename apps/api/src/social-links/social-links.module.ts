import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SocialLink } from './entities/social-link.entity';
import { SocialLinksService } from './social-links.service';
import { SocialLinksController } from './social-links.controller';
import { SocialLinksPublicController } from './social-links-public.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SocialLink])],
  providers: [SocialLinksService],
  controllers: [SocialLinksController, SocialLinksPublicController],
  exports: [SocialLinksService],
})
export class SocialLinksModule {}
