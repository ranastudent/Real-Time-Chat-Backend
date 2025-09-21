import { Body, Controller, Post } from "@nestjs/common";
import { PushService } from "./push.service";

@Controller("push")
export class PushController{
      constructor(private readonly pushService: PushService){}

      @Post('subscribe')
      async subscribe(@Body() subscription: any) {
            
            await this.pushService.sendNotification(subscription, { type: 'subscribe' });

            return { message: 'Subscribed successfully' };

      }
}