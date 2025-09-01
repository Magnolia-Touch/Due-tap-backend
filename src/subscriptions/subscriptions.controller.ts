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
import { SubscriptionsService } from './subscriptions.service';
import { ClientsService } from '../clients/clients.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-roles.enum';
import {
  CreateSubscriptionDto,
  UpdateSubscriptionDto,
  SubscriptionResponseDto,
  SubscriptionQueryDto,
} from './dto/subscription.dto';

@ApiTags('Subscriptions')
@ApiBearerAuth()
@Controller('subscriptions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CLIENT)
export class SubscriptionsController {
  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly clientsService: ClientsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all subscriptions for client' })
  @ApiResponse({ 
    status: 200, 
    description: 'Subscriptions retrieved successfully',
    type: [SubscriptionResponseDto],
  })
  async getSubscriptions(@Request() req, @Query() query: SubscriptionQueryDto) {
    const clientId = await this.clientsService.getClientIdFromUser(req.user.id);
    return this.subscriptionsService.getSubscriptions(clientId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get subscription by ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Subscription retrieved successfully',
    type: SubscriptionResponseDto,
  })
  async getSubscription(@Request() req, @Param('id') id: string) {
    const clientId = await this.clientsService.getClientIdFromUser(req.user.id);
    return this.subscriptionsService.getSubscription(id, clientId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new subscription' })
  @ApiResponse({ 
    status: 201, 
    description: 'Subscription created successfully',
    type: SubscriptionResponseDto,
  })
  async createSubscription(
    @Request() req,
    @Body() createSubscriptionDto: CreateSubscriptionDto,
  ) {
    const clientId = await this.clientsService.getClientIdFromUser(req.user.id);
    return this.subscriptionsService.createSubscription(clientId, createSubscriptionDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a subscription' })
  @ApiResponse({ 
    status: 200, 
    description: 'Subscription updated successfully',
    type: SubscriptionResponseDto,
  })
  async updateSubscription(
    @Request() req,
    @Param('id') id: string,
    @Body() updateSubscriptionDto: UpdateSubscriptionDto,
  ) {
    const clientId = await this.clientsService.getClientIdFromUser(req.user.id);
    return this.subscriptionsService.updateSubscription(id, clientId, updateSubscriptionDto);
  }

  @Put(':id/pause')
  @ApiOperation({ summary: 'Pause a subscription' })
  @ApiResponse({ status: 200, description: 'Subscription paused successfully' })
  async pauseSubscription(@Request() req, @Param('id') id: string) {
    const clientId = await this.clientsService.getClientIdFromUser(req.user.id);
    return this.subscriptionsService.pauseSubscription(id, clientId);
  }

  @Put(':id/resume')
  @ApiOperation({ summary: 'Resume a paused subscription' })
  @ApiResponse({ status: 200, description: 'Subscription resumed successfully' })
  async resumeSubscription(@Request() req, @Param('id') id: string) {
    const clientId = await this.clientsService.getClientIdFromUser(req.user.id);
    return this.subscriptionsService.resumeSubscription(id, clientId);
  }

  @Put(':id/cancel')
  @ApiOperation({ summary: 'Cancel a subscription' })
  @ApiResponse({ status: 200, description: 'Subscription cancelled successfully' })
  async cancelSubscription(@Request() req, @Param('id') id: string) {
    const clientId = await this.clientsService.getClientIdFromUser(req.user.id);
    return this.subscriptionsService.cancelSubscription(id, clientId);
  }

  @Post(':id/resend-notification')
  @ApiOperation({ summary: 'Resend payment notification for subscription' })
  @ApiResponse({ status: 200, description: 'Notification sent successfully' })
  async resendNotification(@Request() req, @Param('id') id: string) {
    const clientId = await this.clientsService.getClientIdFromUser(req.user.id);
    return this.subscriptionsService.resendNotification(id, clientId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a subscription' })
  @ApiResponse({ status: 200, description: 'Subscription deleted successfully' })
  async deleteSubscription(@Request() req, @Param('id') id: string) {
    const clientId = await this.clientsService.getClientIdFromUser(req.user.id);
    return this.subscriptionsService.deleteSubscription(id, clientId);
  }
}
