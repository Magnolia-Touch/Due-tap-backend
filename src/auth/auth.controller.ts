// // src/auth/auth.controller.ts
// import {
//   Controller,
//   Post,
//   Body,
//   UseGuards,
//   Get,
//   Request,
// } from '@nestjs/common';
// import { AuthService } from './auth.service';
// import { LoginDto } from './dto/login.dto';
// import { OtpVerifyDto } from './dto/otp-verify.dto';
// import { EmailDto } from './dto/email.dto';
// import { RegisterDto } from './dto/register.dto';
// import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

// @Controller('auth')
// export class AuthController {
//   constructor(private readonly authService: AuthService) { }

//   @Post('login')
//   async login(@Body() loginDto: LoginDto) {
//     return this.authService.login(loginDto);
//   }

//   @Post('register')
//   async register(@Body() registerDto: RegisterDto) {
//     return this.authService.register(registerDto);
//   }

//   @Get('profile')
//   @UseGuards(JwtAuthGuard)
//   getProfile(@Request() req) {
//     return req.user;
//   }

//   @Post('otp/generate')
//   async generateOtp(@Body() emailDto: EmailDto) {
//     return this.authService.generateOtp(emailDto.email);
//   }

//   @Post('otp/verify')
//   async verifyOtp(@Body() otpVerifyDto: OtpVerifyDto) {
//     return this.authService.validateOtp(otpVerifyDto.email, otpVerifyDto.otp);
//   }
// }


// src/auth/auth.controller.ts
import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Request,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { OtpVerifyDto } from './dto/otp-verify.dto';
import { EmailDto } from './dto/email.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('login')
  @ApiOperation({ summary: 'Login using email & password' })
  @ApiResponse({ status: 200, description: 'Logged in successfully' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Get('profile')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get logged-in user profile' })
  @ApiResponse({ status: 200, description: 'User profile returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getProfile(@Request() req) {
    return req.user;
  }

  @Post('otp/generate')
  @ApiOperation({ summary: 'Generate OTP for email verification' })
  @ApiResponse({ status: 200, description: 'OTP sent successfully' })
  @ApiResponse({ status: 400, description: 'Invalid email' })
  async generateOtp(@Body() emailDto: EmailDto) {
    return this.authService.generateOtp(emailDto.email);
  }

  @Post('otp/verify')
  @ApiOperation({ summary: 'Verify OTP for email' })
  @ApiResponse({ status: 200, description: 'OTP verified' })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
  async verifyOtp(@Body() otpVerifyDto: OtpVerifyDto) {
    return this.authService.validateOtp(
      otpVerifyDto.email,
      otpVerifyDto.otp,
    );
  }
}
