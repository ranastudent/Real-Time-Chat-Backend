import { Module } from "@nestjs/common";
import { PushController } from "./push.controller";
import { PushService } from "./push.service";

@Module({
      providers: [PushService],
      controllers: [PushController],
      exports: [PushService]
})

export class PushModule {}