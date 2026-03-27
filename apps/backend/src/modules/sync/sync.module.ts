import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SyncController } from './sync.controller';
import { SyncProcessor } from './sync.processor';
import { SyncLog } from './entities/sync-log.entity';
import { SyncService } from './sync.service';

@Module({
  imports: [TypeOrmModule.forFeature([SyncLog]), BullModule.registerQueue({ name: 'sync' })],
  controllers: [SyncController],
  providers: [SyncService, SyncProcessor],
  exports: [SyncService],
})
export class SyncModule {}
