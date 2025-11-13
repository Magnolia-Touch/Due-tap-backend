import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationDto, PaginatedResponseDto, PaginationMetaDto } from '../common/dto/pagination.dto';
import {
  CreateTemplateDto,
  UpdateTemplateDto,
  TemplateResponseDto,
} from './dto/template.dto';

@Injectable()
export class TemplatesService {
  constructor(private readonly prisma: PrismaService) { }

  async getTemplates(
    clientId: string,
    pagination: PaginationDto,
  ): Promise<PaginatedResponseDto<TemplateResponseDto>> {
    const { page, limit, search } = pagination;
    const skip = (page - 1) * limit;

    const where = {
      clientId,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { title: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [templates, total] = await Promise.all([
      this.prisma.template.findMany({
        where,
        include: {
          _count: {
            select: {
              subscriptions: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.template.count({ where }),
    ]);

    const data = await Promise.all(
      templates.map(async (template) => {
        const revenue = await this.getTemplateRevenue(template.id);
        return {
          id: template.id,
          name: template.name,
          title: template.title,
          body: template.body,
          recurringDuration: template.recurringDuration,
          durationUnit: template.durationUnit,
          notificationMethod: template.notificationMethod,
          paymentMethod: template.paymentMethod,
          defaultAmount: template.defaultAmount ? Number(template.defaultAmount) : undefined,
          isActive: template.isActive,
          createdAt: template.createdAt,
          updatedAt: template.updatedAt,
          subscriptionCount: template._count.subscriptions,
          totalRevenue: revenue,
        };
      }),
    );

    const totalPages = Math.ceil(total / limit);
    const meta: PaginationMetaDto = {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };

    return { data, meta };
  }

  async getTemplate(id: string, clientId: string): Promise<TemplateResponseDto> {
    const template = await this.prisma.template.findFirst({
      where: { id, clientId },
      include: {
        _count: {
          select: {
            subscriptions: true,
          },
        },
      },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    const revenue = await this.getTemplateRevenue(template.id);

    return {
      id: template.id,
      name: template.name,
      title: template.title,
      body: template.body,
      recurringDuration: template.recurringDuration,
      durationUnit: template.durationUnit,
      notificationMethod: template.notificationMethod,
      paymentMethod: template.paymentMethod,
      defaultAmount: template.defaultAmount ? Number(template.defaultAmount) : undefined,
      isActive: template.isActive,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
      subscriptionCount: template._count.subscriptions,
      totalRevenue: revenue,
    };
  }

  async createTemplate(
    clientId: string,
    createTemplateDto: CreateTemplateDto,
  ): Promise<TemplateResponseDto> {
    const template = await this.prisma.template.create({
      data: {
        ...createTemplateDto,
        clientId,
      },
    });

    return {
      id: template.id,
      name: template.name,
      title: template.title,
      body: template.body,
      recurringDuration: template.recurringDuration,
      durationUnit: template.durationUnit,
      notificationMethod: template.notificationMethod,
      paymentMethod: template.paymentMethod,
      defaultAmount: template.defaultAmount ? Number(template.defaultAmount) : undefined,
      isActive: template.isActive,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
      subscriptionCount: 0,
      totalRevenue: 0,
    };
  }

  async updateTemplate(
    id: string,
    clientId: string,
    updateTemplateDto: UpdateTemplateDto,
  ): Promise<TemplateResponseDto> {
    const template = await this.prisma.template.findFirst({
      where: { id, clientId },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    const updatedTemplate = await this.prisma.template.update({
      where: { id },
      data: updateTemplateDto,
    });

    return this.getTemplate(id, clientId);
  }

  async deleteTemplate(id: string, clientId: string) {
    const template = await this.prisma.template.findFirst({
      where: { id, clientId },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    // Check if template has active subscriptions
    const activeSubscriptions = await this.prisma.subscription.count({
      where: { templateId: id, status: 'ACTIVE' },
    });

    if (activeSubscriptions > 0) {
      throw new ForbiddenException(
        'Cannot delete template with active subscriptions. Please cancel all subscriptions first.',
      );
    }

    await this.prisma.template.delete({
      where: { id },
    });

    return { message: 'Template deleted successfully' };
  }

  async toggleTemplateStatus(id: string, clientId: string) {
    const template = await this.prisma.template.findFirst({
      where: { id, clientId },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    const updatedTemplate = await this.prisma.template.update({
      where: { id },
      data: { isActive: !template.isActive },
    });

    return updatedTemplate;
  }

  // Private helper methods
  private async getTemplateRevenue(templateId: string): Promise<number> {
    const result = await this.prisma.payment.aggregate({
      where: {
        subscription: {
          templateId,
        },
        status: 'PAID',
      },
      _sum: { amount: true },
    });
    return Number(result._sum.amount) || 0;
  }
}
