import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { ClientsService } from '../clients/clients.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-roles.enum';
import {
  UpdateSettingsDto,
  SettingsResponseDto,
  WhatsAppSettingsDto,
  EmailSettingsDto,
  RazorpaySettingsDto,
  StripeSettingsDto,
  TestSettingsDto,
} from './dto/settings.dto';

@ApiTags('Settings')
@ApiBearerAuth()
@Controller('settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CLIENT)
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly clientsService: ClientsService,
  ) { }

  @Get()
  @ApiOperation({ summary: 'Get client settings' })
  @ApiResponse({
    status: 200,
    description: 'Settings retrieved successfully',
    type: SettingsResponseDto,
  })
  async getSettings(@Request() req) {
    const clientId = await this.clientsService.getClientIdFromUser(req.user.id);
    return this.settingsService.getSettings(clientId);
  }

  @Put()
  @ApiOperation({ summary: 'Update client settings' })
  @ApiResponse({
    status: 200,
    description: 'Settings updated successfully',
    type: SettingsResponseDto,
  })
  async updateSettings(
    @Request() req,
    @Body() updateSettingsDto: UpdateSettingsDto,
  ) {
    const clientId = await this.clientsService.getClientIdFromUser(req.user.id);
    return this.settingsService.updateSettings(clientId, updateSettingsDto);
  }

  @Put('whatsapp')
  @ApiOperation({ summary: 'Update WhatsApp settings' })
  @ApiResponse({ status: 200, description: 'WhatsApp settings updated successfully' })
  async updateWhatsAppSettings(
    @Request() req,
    @Body() whatsappSettings: WhatsAppSettingsDto,
  ) {
    const clientId = await this.clientsService.getClientIdFromUser(req.user.id);
    return this.settingsService.updateWhatsAppSettings(clientId, whatsappSettings);
  }

  @Put('email')
  @ApiOperation({ summary: 'Update Email settings' })
  @ApiResponse({ status: 200, description: 'Email settings updated successfully' })
  async updateEmailSettings(
    @Request() req,
    @Body() emailSettings: EmailSettingsDto,
  ) {
    const clientId = await this.clientsService.getClientIdFromUser(req.user.id);
    return this.settingsService.updateEmailSettings(clientId, emailSettings);
  }

  @Put('razorpay')
  @ApiOperation({ summary: 'Update Razorpay settings' })
  @ApiResponse({ status: 200, description: 'Razorpay settings updated successfully' })
  async updateRazorpaySettings(
    @Request() req,
    @Body() razorpaySettings: RazorpaySettingsDto,
  ) {
    const clientId = await this.clientsService.getClientIdFromUser(req.user.id);
    return this.settingsService.updateRazorpaySettings(clientId, razorpaySettings);
  }

  @Put('stripe')
  @ApiOperation({ summary: 'Update Stripe settings' })
  @ApiResponse({ status: 200, description: 'Stripe settings updated successfully' })
  async updateStripeSettings(
    @Request() req,
    @Body() stripeSettings: StripeSettingsDto,
  ) {
    const clientId = await this.clientsService.getClientIdFromUser(req.user.id);
    return this.settingsService.updateStripeSettings(clientId, stripeSettings);
  }

  @Post('test')
  @ApiOperation({ summary: 'Test integration settings' })
  @ApiResponse({ status: 200, description: 'Settings test completed' })
  async testSettings(
    @Request() req,
    @Body() testSettings: TestSettingsDto,
  ) {
    const clientId = await this.clientsService.getClientIdFromUser(req.user.id);
    return this.settingsService.testSettings(clientId, testSettings);
  }
}
