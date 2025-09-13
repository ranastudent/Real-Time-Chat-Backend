import { Module } from '@nestjs/common';
import { ChatModule } from './modules/chat/chat.module';
import { AuthModule } from './modules/auth/auth.module'; // ✅ Import AuthModule

@Module({
  imports: [ChatModule, AuthModule], // ✅ Add AuthModule here
})
export class AppModule {}
