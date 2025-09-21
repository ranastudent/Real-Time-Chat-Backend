import { Module } from '@nestjs/common';
import { ChatModule } from './modules/chat/chat.module';
import { AuthModule } from './modules/auth/auth.module'; // ✅ Import AuthModule
import { PushModule } from 'modules/push/push.module';

@Module({
  imports: [ChatModule, AuthModule, PushModule], // ✅ Add AuthModule here
})
export class AppModule {}
