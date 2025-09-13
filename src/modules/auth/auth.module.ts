import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { PrismaService } from '../../prisma/Prisma.service';
import { JwtAuthGuard } from './jwt-auth.guard'; // ✅ import guard


@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'secretKey',
      signOptions: { expiresIn: '1d' },
    }),
  ],
  providers: [AuthService, JwtStrategy, PrismaService, JwtAuthGuard], // ✅ provide guard
  controllers: [AuthController],
  exports: [JwtAuthGuard], // ✅ export to use in other modules (like ChatModule)
})
export class AuthModule {}
