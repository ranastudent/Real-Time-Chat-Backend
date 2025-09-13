import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/Prisma.service";
import * as bcrypt from "bcrypt";
import { JwtService } from "@nestjs/jwt";

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService
  ) {}

  async register(
    name: string,
    phone: string,
    email: string,
    password: string
  ) {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ phone }, { email }] },
    });
    if (existing) throw new BadRequestException("User already exists");

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: { name, phone, email, password: hashedPassword },
    });

    return { user };
  }

  async validateUser(phone: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user) throw new NotFoundException("User not found");

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new BadRequestException("Invalid credentials");

    return user;
  }

  async login(phone: string, password: string, deviceId: string) {
    const user = await this.validateUser(phone, password);

    // Generate JWT
    const token = this.jwtService.sign({ sub: user.id, phone: user.phone });

    // Upsert device: create new or update existing with latest JWT
    await this.prisma.device.upsert({
      where: { deviceId }, // unique deviceId
      update: { jwtToken: token, userId: user.id },
      create: { userId: user.id, deviceId, jwtToken: token },
    });

    // Delete all other devices except current one (enforce single-device login)
    await this.prisma.device.deleteMany({
      where: { userId: user.id, deviceId: { not: deviceId } },
    });

    return { user, token, deviceId };
  }
}
