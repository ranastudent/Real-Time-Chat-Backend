import { Module } from '@nestjs/common';
import { RedisService } from './redis.service';

@Module({
  providers: [RedisService],
  exports: [RedisService], // 👈 important, so other modules can use it
})
export class RedisModule {}
