import { Controller, Post, Param, NotFoundException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentStatus } from '@prisma/client';

@Controller('notifications')
export class NotificationsController {
    constructor(
        private readonly notificationsService: NotificationsService,
        private readonly prisma: PrismaService,
    ) { }

    // 👇 Manual reminder trigger
    @Post('test-reminder/:taskId')
    async testSendReminder(@Param('taskId') taskId: string) {
        // 1️⃣ Get the task
        const task = await this.prisma.task.findUnique({
            where: { id: taskId },
            include: {
                subscription: {
                    include: {
                        payments: {
                            where: {
                                OR: [
                                    { status: PaymentStatus.PENDING },
                                    { status: PaymentStatus.OVERDUE },
                                ],
                            },
                            take: 1,
                        },
                    },
                },
            },
        });

        if (!task) {
            throw new NotFoundException(`Task with ID ${taskId} not found`);
        }

        const subscription = task.subscription;
        const payment = subscription?.payments?.[0];

        if (!payment) {
            throw new NotFoundException(
                `No active PENDING/OVERDUE payment found for task ${taskId}`,
            );
        }

        // 2️⃣ Prepare the notification payload
        const paymentData = {
            paymentId: payment.id,
            subscriptionId: subscription.id,
            endUserId: task.endUserId,
            clientId: task.clientId,
            amount: Number(task.amount),
            dueDate: task.dueDate,
            templateId: task.templateId,
            templateName: task.templateName,
            templateTitle: task.templateTitle,
            templateBody: task.templateBody,
            paymentLink: task.paymentLink || '',
        };

        // 3️⃣ Send the notification
        const result = await this.notificationsService.sendPaymentReminder(paymentData);

        // 4️⃣ Mark the task as sent
        await this.prisma.task.update({
            where: { id: task.id },
            data: { isSent: true },
        });

        return {
            message: '✅ Reminder sent successfully!',
            result,
        };
    }
}
