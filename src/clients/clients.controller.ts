import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ClientsService } from './clients.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-roles.enum';
import { ClientDashboardStatsDto } from './dto/dashboard.dto';
import { CreatePaymentLinkDto } from './dto/create-payment-link.dto';

@ApiTags('Client Dashboard')
@ApiBearerAuth()
@Controller('clients')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CLIENT)
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) { }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get Client Dashboard Data' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard data retrieved successfully',
    type: ClientDashboardStatsDto,
  })
  async getDashboard(@Request() req) {
    console.log("--user", req.user.id)
    const clientId = await this.clientsService.getClientIdFromUser(req.user.id);
    return this.clientsService.getDashboardData(clientId);
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get client profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  async getProfile(@Request() req) {
    const clientId = await this.clientsService.getClientIdFromUser(req.user.id);
    return this.clientsService.getClientProfile(clientId);
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update client profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  async updateProfile(@Request() req, @Body() updateData: any) {
    const clientId = await this.clientsService.getClientIdFromUser(req.user.id);
    return this.clientsService.updateClientProfile(clientId, updateData);
  }

  // clients.controller.ts
  @Put('payment-keys')
  @ApiOperation({ summary: 'Add or update client payment provider keys' })
  async addPaymentKeys(@Request() req, @Body() keys: any) {
    const userId = req.user.id;
    return this.clientsService.AddPaymentServiceProvidersKeys(userId, keys);
  }

  @Post('payment-link-razrpy')
  @ApiOperation({ summary: 'Generate Razorpay payment link' })
  async createPaymentLink(@Request() req, @Body() payload: CreatePaymentLinkDto) {
    const clientId = await this.clientsService.getClientIdFromUser(req.user.id);
    return this.clientsService.generatePaymentLink(clientId, payload);
  }

  @Post('payment-link-stripe')
  @ApiOperation({ summary: 'Generate Razorpay payment link' })
  async createPaymentLinkforStripe(@Request() req, @Body() payload: CreatePaymentLinkDto) {
    const clientId = await this.clientsService.getClientIdFromUser(req.user.id);
    return this.clientsService.generatePaymentLinkForSripe(clientId, payload);
  }


}
