import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserCheckin } from './entities/user-checkin.entity';
import { CheckinService } from './checkin.service';
import { CheckinController } from './checkin.controller';
import { PointsModule } from '../points/points.module';

@Module({
  imports: [TypeOrmModule.forFeature([UserCheckin]), PointsModule],
  providers: [CheckinService],
  controllers: [CheckinController],
  exports: [CheckinService],
})
export class CheckinModule {}
