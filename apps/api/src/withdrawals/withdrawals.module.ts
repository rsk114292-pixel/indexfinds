import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PointWithdrawal } from './entities/point-withdrawal.entity';
import { PointsModule } from '../points/points.module';
import { WithdrawalsService } from './withdrawals.service';
import { WithdrawalsController } from './withdrawals.controller';
import { WithdrawalsAdminController } from './withdrawals-admin.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PointWithdrawal]), PointsModule],
  providers: [WithdrawalsService],
  controllers: [WithdrawalsController, WithdrawalsAdminController],
  exports: [WithdrawalsService],
})
export class WithdrawalsModule {}
