import { Controller, Post, Body } from "@nestjs/common";
import { AuthService } from "./auth.service";

@Controller("auth")
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post("register")
  async register(
    @Body()
    body: {
      name: string;
      phone: string;
      email: string;
      password: string;
    }
  ) {
    return this.authService.register(
      body.name,
      body.phone,
      body.email,
      body.password
    );
  }

  @Post("login")
  async login(
    @Body() body: { phone: string; password: string; deviceId: string }
  ) {
    return this.authService.login(body.phone, body.password, body.deviceId);
  }
}
