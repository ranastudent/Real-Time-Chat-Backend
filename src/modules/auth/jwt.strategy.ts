import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { PrismaService } from "../../prisma/Prisma.service";
import { Request } from "express";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET || "secretKey",
      passReqToCallback: true, // ✅ allows access to req
    });
  }

  async validate(req: Request, payload: any) {
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);

    // Ensure token belongs to the active device
    const device = await this.prisma.device.findFirst({
      where: { userId: payload.sub, jwtToken: token },
    });

    if (!device) {
      throw new UnauthorizedException(
        "Invalid session. Logged in on another device."
      );
    }

    // Return user + device info for request context
    return {
      userId: payload.sub,
      phone: payload.phone,
      deviceId: device.deviceId,
    };
  }
}
