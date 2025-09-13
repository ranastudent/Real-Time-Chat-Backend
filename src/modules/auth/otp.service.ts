// src/modules/auth/otp.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import Redis from 'ioredis';
import { randomInt } from 'crypto';

@Injectable()
export class OtpService {
  private redis: Redis;

  constructor() {
    this.redis = new Redis(); // default: localhost:6379
  }

  async generateOtp(phone: string): Promise<string> {
    const otp = randomInt(100000, 999999).toString(); // 6-digit OTP

    // Store in Redis for 5 minutes
    await this.redis.setex(`otp:${phone}`, 300, otp);

    return otp;
  }

  async verifyOtp(phone: string, otp: string): Promise<boolean> {
    const storedOtp = await this.redis.get(`otp:${phone}`);

    if (!storedOtp) {
      throw new BadRequestException('OTP expired or not found');
    }

    if (storedOtp !== otp) {
      throw new BadRequestException('Invalid OTP');
    }

    // ✅ OTP valid → delete from Redis
    await this.redis.del(`otp:${phone}`);

    return true;
  }
}
