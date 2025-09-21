import { Injectable } from '@nestjs/common';
import * as webPush from 'web-push';

@Injectable()
export class PushService {
     constructor(){
      webPush.setVapidDetails(
        'mailto:Zxv3t@example.com',
        process.env.VAPID_PUBLIC_KEY!,
        process.env.VAPID_PRIVATE_KEY!
      );
     }

     async sendNotification(subscription: any, playload: any) {
           try {
             return await webPush.sendNotification(subscription, playload);
           } catch (error) {
             console.log(error);
           }
     }
}
