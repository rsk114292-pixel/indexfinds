import { Module } from '@nestjs/common';
import { AIService } from './ai.service';
import { AIApiService } from './ai-api.service';
import { AIResponseParserService } from './ai-response-parser.service';
import { AIEventListener } from './ai-event.listener';
import { AI_PROVIDER } from './interfaces/ai-provider.interface';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [SettingsModule],
  providers: [
    AIService,
    AIApiService,
    AIResponseParserService,
    AIEventListener,
    {
      provide: AI_PROVIDER,
      useExisting: AIApiService,
    },
  ],
  exports: [AIService, AIResponseParserService],
})
export class AIModule {}
