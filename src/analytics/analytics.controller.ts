import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { AnalyticsService } from './analytics.service';
import {
  AnalyticsQueryDto,
  PaymentAnalyticsDto,
  TemplateAnalyticsDto,
  ClientAnalyticsDto,
  SuperAdminAnalyticsDto,
  NotificationAnalyticsDto,
} from './dto/analytics.dto';

@ApiTags('Analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('payments')
  @Roles(UserRole.CLIENT)
  @ApiOperation({ summary: 'Get payment analytics for client' })
  async getPaymentAnalytics(
    @CurrentUser() user: any,
    @Query() query: AnalyticsQueryDto,
  ): Promise<PaymentAnalyticsDto> {
    return this.analyticsService.getPaymentAnalytics(user.clientId, query);
  }

  @Get('templates')
  @Roles(UserRole.CLIENT)
  @ApiOperation({ summary: 'Get template analytics for client' })
  async getTemplateAnalytics(
    @CurrentUser() user: any,
    @Query() query: AnalyticsQueryDto,
  ): Promise<TemplateAnalyticsDto[]> {
    return this.analyticsService.getTemplateAnalytics(user.clientId, query);
  }

  @Get('client')
  @Roles(UserRole.CLIENT)
  @ApiOperation({ summary: 'Get comprehensive client analytics' })
  async getClientAnalytics(
    @CurrentUser() user: any,
    @Query() query: AnalyticsQueryDto,
  ): Promise<ClientAnalyticsDto> {
    return this.analyticsService.getClientAnalytics(user.clientId, query);
  }

  @Get('notifications')
  @Roles(UserRole.CLIENT)
  @ApiOperation({ summary: 'Get notification analytics for client' })
  async getNotificationAnalytics(
    @CurrentUser() user: any,
    @Query() query: AnalyticsQueryDto,
  ): Promise<NotificationAnalyticsDto> {
    return this.analyticsService.getNotificationAnalytics(user.clientId, query);
  }

  @Get('super-admin')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get platform analytics for super admin' })
  async getSuperAdminAnalytics(
    @Query() query: AnalyticsQueryDto,
  ): Promise<SuperAdminAnalyticsDto> {
    return this.analyticsService.getSuperAdminAnalytics(query);
  }
}
