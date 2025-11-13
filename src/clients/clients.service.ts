import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ClientDashboardStatsDto } from './dto/dashboard.dto';
import { encryptText, decryptText } from 'src/common/utils/crypto.util';
const Razorpay = require('razorpay');
import Stripe from 'stripe';

import { CreatePaymentLinkDto } from './dto/create-payment-link.dto';
// clients.service.ts

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) { }

  async getClientIdFromUser(userId: string): Promise<string> {
    const client = await this.prisma.client.findFirst({
      where: { userId },
    });

    if (!client) {
      throw new ForbiddenException('User is not associated with a client');
    }

    return client.id;
  }

  async getDashboardData(clientId: string): Promise<ClientDashboardStatsDto> {
    console.log("000000000000000")
    const client = await this.prisma.client.findUnique({
      where: { id: clientId }
    })
    if (!client.id) {
      throw new ForbiddenException("User Not found")
    }
    console.log("000000000000000")
    const [
      totalPayments,
      activeUsers,
      activeSubscriptions,
      paymentTrends,
      paymentDistribution,
      recentPayments,
    ] = await Promise.all([
      this.getTotalPaymentsCollected(clientId),
      this.getActiveUsersCount(clientId),
      this.getActiveSubscriptionsCount(clientId),
      this.getPaymentTrends(clientId),
      this.getPaymentDistribution(clientId),
      this.getRecentPayments(clientId),
    ]);

    return {
      totalPaymentsCollected: totalPayments,
      activeUsers,
      activeSubscriptions,
      paymentTrends,
      paymentDistribution,
      recentPayments,
    };
  }

  async getClientProfile(clientId: string) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            profilePicture: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        settings: true,
      },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    return client;
  }

  async updateClientProfile(clientId: string, updateData: any) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    const { name, email, phone, businessName, description } = updateData;

    const updatedClient = await this.prisma.$transaction(async (tx) => {
      // Update user fields
      if (name || email || phone) {
        await tx.user.update({
          where: { id: client.userId },
          data: {
            ...(name && { name }),
            ...(email && { email }),
            ...(phone && { phone }),
          },
        });
      }

      // Update client fields
      return tx.client.update({
        where: { id: clientId },
        data: {
          ...(businessName && { businessName }),
          ...(description && { description }),
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              profilePicture: true,
            },
          },
        },
      });
    });

    return updatedClient;
  }

  // Private helper methods
  private async getTotalPaymentsCollected(clientId: string): Promise<number> {
    const result = await this.prisma.payment.aggregate({
      where: { clientId, status: 'PAID' },
      _sum: { amount: true },
    });
    return Number(result._sum.amount) || 0;
  }

  private async getActiveUsersCount(clientId: string): Promise<number> {
    return this.prisma.endUser.count({
      where: { clientId, status: 'active' },
    });
  }

  private async getActiveSubscriptionsCount(clientId: string): Promise<number> {
    return this.prisma.subscription.count({
      where: { clientId, status: 'ACTIVE' },
    });
  }

  private async getPaymentTrends(clientId: string) {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const payments = await this.prisma.payment.findMany({
      where: {
        clientId,
        status: 'PAID',
        paidDate: {
          gte: sixMonthsAgo,
        },
      },
      select: {
        amount: true,
        paidDate: true,
      },
    });

    const trendsByMonth = new Map();
    payments.forEach(payment => {
      const month = payment.paidDate.toISOString().substring(0, 7);
      const current = trendsByMonth.get(month) || 0;
      trendsByMonth.set(month, current + Number(payment.amount));
    });

    return Array.from(trendsByMonth.entries()).map(([date, amount]) => ({
      date,
      amount,
    }));
  }

  private async getPaymentDistribution(clientId: string) {
    const payments = await this.prisma.payment.groupBy({
      by: ['status'],
      where: { clientId },
      _count: { status: true },
    });

    const distribution = {
      paid: 0,
      pending: 0,
      failed: 0,
      overdue: 0,
    };

    payments.forEach(item => {
      switch (item.status) {
        case 'PAID':
          distribution.paid = item._count.status;
          break;
        case 'PENDING':
          distribution.pending = item._count.status;
          break;
        case 'FAILED':
          distribution.failed = item._count.status;
          break;
        case 'OVERDUE':
          distribution.overdue = item._count.status;
          break;
      }
    });

    return distribution;
  }

  private async getRecentPayments(clientId: string) {
    const payments = await this.prisma.payment.findMany({
      where: { clientId, status: 'PAID' },
      include: {
        endUser: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { paidDate: 'desc' },
      take: 5,
    });

    return payments.map(payment => ({
      id: payment.id,
      amount: Number(payment.amount),
      endUserName: payment.endUser.name,
      paidDate: payment.paidDate,
    }));
  }



  async AddPaymentServiceProvidersKeys(user_id: string, keys: {
    razorpay_key_id?: string;
    razorpay_key_secret?: string;
    stripe_key_id?: string;
    stripe_key_secret?: string;
  }) {
    const client = await this.prisma.client.findFirst({
      where: { userId: user_id },
    });

    if (!client) {
      throw new NotFoundException('Client not found for this user');
    }

    const { razorpay_key_id, razorpay_key_secret, stripe_key_id, stripe_key_secret } = keys;

    if (!razorpay_key_id && !stripe_key_id) {
      throw new BadRequestException('No payment keys provided');
    }

    const updateData: any = {};

    if (razorpay_key_id) updateData.razorpay_key_id = encryptText(razorpay_key_id);
    if (razorpay_key_secret) updateData.razorpay_key_secret = encryptText(razorpay_key_secret);
    if (stripe_key_id) updateData.stripe_key_id = encryptText(stripe_key_id);
    if (stripe_key_secret) updateData.stripe_key_secret = encryptText(stripe_key_secret);

    await this.prisma.client.update({
      where: { id: client.id },
      data: updateData,
    });

    return { message: 'Payment provider keys added successfully' };
  }

  async generatePaymentLink(clientId: string, payload: CreatePaymentLinkDto) {
    // 1️⃣ Find client and decrypt keys
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    if (!client.razorpay_key_id || !client.razorpay_key_secret) {
      throw new BadRequestException('Razorpay keys not configured for this client');
    }

    const razorpayKeyId = decryptText(client.razorpay_key_id);
    const razorpayKeySecret = decryptText(client.razorpay_key_secret);

    // 2️⃣ Create Razorpay instance dynamically
    const razorpay = new Razorpay({
      key_id: razorpayKeyId,
      key_secret: razorpayKeySecret,
    });

    // 3️⃣ Prepare payment link options
    const options = {
      amount: payload.amount,
      currency: payload.currency,
      description: payload.description,
      customer: {
        name: payload.customer_name,
        email: payload.customer_email,
        contact: payload.customer_contact,
      },
      notify: {
        sms: true,
        email: true,
      },
    };

    // 4️⃣ Create payment link via Razorpay SDK
    const paymentLink = await razorpay.paymentLink.create(options);

    // 6️⃣ Return link to frontend
    return {
      message: 'Payment link created successfully',
      link: paymentLink.short_url,
      status: paymentLink.status,
    };
  }

  async generatePaymentLinkForSripe(clientId: string, payload: CreatePaymentLinkDto) {
    // 1️⃣ Find client and decrypt Stripe key
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    if (!client.stripe_key_secret) {
      throw new BadRequestException('Stripe key not configured for this client');
    }

    const stripeSecretKey = decryptText(client.stripe_key_secret);

    // 2️⃣ Initialize Stripe instance
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-10-29.clover',
    });

    // 3️⃣ Create product and price (amount already in paise)
    const product = await stripe.products.create({
      name: payload.description || 'Payment',
    });

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: payload.amount, // already in paise
      currency: payload.currency.toLowerCase(),
    });

    // 4️⃣ Create Stripe payment link
    const paymentLink = await stripe.paymentLinks.create({
      line_items: [
        {
          price: price.id,
          quantity: 1,
        },
      ],
      //need to give payment success url
      after_completion: {
        type: 'redirect',
        redirect: { url: 'https://yourdomain.com/payment-success' }, // customize
      },
      metadata: {
        client_id: clientId,
        customer_name: payload.customer_name,
        customer_email: payload.customer_email,
        customer_contact: payload.customer_contact,
      },
    });

    // 5️⃣ Return the payment link to frontend
    return {
      message: 'Payment link created successfully',
      link: paymentLink.url,
      status: paymentLink.active ? 'active' : 'inactive',
    };
  }
}
