import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";

import { Redis } from "ioredis";

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client!: Redis;

  onModuleInit() {
    this.client = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

    this.client.on("connect", () => {
      console.log("redis connected");
    });

    this.client.on("error", (err) => {
      console.log("redis connection error", err);
    });
  }

  getClient(): Redis {
    return this.client;
  }

  async onModuleDestroy() {
    await this.client.quit();
  }
}
