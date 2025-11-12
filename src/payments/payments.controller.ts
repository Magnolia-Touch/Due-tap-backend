import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  HttpCode,
  Headers,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { ClientsService } from '../clients/clients.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-roles.enum';
import {
  CreatePaymentDto,
  UpdatePaymentDto,
  PaymentResponseDto,
  PaymentQueryDto,
  MarkAsPaidDto,
  CreatePaymentLinkDto,
} from './dto/payment.dto';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly clientsService: ClientsService,
  ) { }

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CLIENT)
  @ApiOperation({ summary: 'Get all payments for client' })
  @ApiResponse({
    status: 200,
    description: 'Payments retrieved successfully',
    type: [PaymentResponseDto],
  })
  async getPayments(@Request() req, @Query() query: PaymentQueryDto) {
    const clientId = await this.clientsService.getClientIdFromUser(req.user.id);
    return this.paymentsService.getPayments(clientId, query);
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CLIENT)
  @ApiOperation({ summary: 'Get payment by ID' })
  @ApiResponse({
    status: 200,
    description: 'Payment retrieved successfully',
    type: PaymentResponseDto,
  })
  async getPayment(@Request() req, @Param('id') id: string) {
    const clientId = await this.clientsService.getClientIdFromUser(req.user.id);
    return this.paymentsService.getPayment(id, clientId);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CLIENT)
  @ApiOperation({ summary: 'Create a new payment' })
  @ApiResponse({
    status: 201,
    description: 'Payment created successfully',
    type: PaymentResponseDto,
  })
  async createPayment(
    @Request() req,
    @Body() createPaymentDto: CreatePaymentDto,
  ) {
    const clientId = await this.clientsService.getClientIdFromUser(req.user.id);
    return this.paymentsService.createPayment(clientId, createPaymentDto);
  }

  @Put(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CLIENT)
  @ApiOperation({ summary: 'Update a payment' })
  @ApiResponse({
    status: 200,
    description: 'Payment updated successfully',
    type: PaymentResponseDto,
  })
  async updatePayment(
    @Request() req,
    @Param('id') id: string,
    @Body() updatePaymentDto: UpdatePaymentDto,
  ) {
    const clientId = await this.clientsService.getClientIdFromUser(req.user.id);
    return this.paymentsService.updatePayment(id, clientId, updatePaymentDto);
  }

  @Put(':id/mark-as-paid')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CLIENT)
  @ApiOperation({ summary: 'Mark payment as paid (manual)' })
  @ApiResponse({ status: 200, description: 'Payment marked as paid successfully' })
  async markAsPaid(
    @Request() req,
    @Param('id') id: string,
    @Body() markAsPaidDto: MarkAsPaidDto,
  ) {
    const clientId = await this.clientsService.getClientIdFromUser(req.user.id);
    return this.paymentsService.markAsPaid(id, clientId, markAsPaidDto);
  }

  @Post(':id/resend-notification')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CLIENT)
  @ApiOperation({ summary: 'Resend payment notification' })
  @ApiResponse({ status: 200, description: 'Notification sent successfully' })
  async resendNotification(
    @Request() req,
    @Param('id') id: string,
  ) {
    const clientId = await this.clientsService.getClientIdFromUser(req.user.id);
    return this.paymentsService.resendNotification(id, clientId);
  }

  @Post(':id/payment-link')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CLIENT)
  @ApiOperation({ summary: 'Create payment link' })
  @ApiResponse({ status: 200, description: 'Payment link created successfully' })
  async createPaymentLink(
    @Request() req,
    @Param('id') id: string,
    @Body() createPaymentLinkDto: CreatePaymentLinkDto,
  ) {
    const clientId = await this.clientsService.getClientIdFromUser(req.user.id);
    return this.paymentsService.createPaymentLink(id, clientId, createPaymentLinkDto);
  }

  // Webhook endpoints (public)
  @Post('webhooks/razorpay')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Razorpay webhook handler' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  async handleRazorpayWebhook(
    @Body() body: any,
    @Headers('x-razorpay-signature') signature: string,
  ) {
    return this.paymentsService.handleRazorpayWebhook(body, signature);
  }

  @Post('webhooks/stripe')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stripe webhook handler' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  async handleStripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    return this.paymentsService.handleStripeWebhook(req.rawBody, signature);
  }
}
