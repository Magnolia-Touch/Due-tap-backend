import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';
import { startOfDay, endOfDay } from 'date-fns';
import { PaymentStatus } from '@prisma/client';

@Injectable()
export class NotificationScheduler {
    private readonly logger = new Logger(NotificationScheduler.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly notificationsService: NotificationsService,
    ) { }

    // 🕐 Runs every day at 8 AM (you can change to any schedule)
    @Cron(CronExpression.EVERY_DAY_AT_8AM)
    async handleDailyReminders() {
        this.logger.log('🔔 Running daily task reminder scheduler...');

        // 1️⃣ Get all pending tasks scheduled for today and not sent yet
        const todayStart = startOfDay(new Date());
        const todayEnd = endOfDay(new Date());

        const tasks = await this.prisma.task.findMany({
            where: {
                notificationDate: {
                    gte: todayStart,
                    lte: todayEnd,
                },
                isSent: false, // only unsent
            },
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
                            take: 1, // only one relevant payment
                        },
                    },
                },
            },
        });

        if (!tasks.length) {
            this.logger.log('✅ No tasks to send today.');
            return;
        }

        this.logger.log(`📬 Found ${tasks.length} task(s) to process.`);

        for (const task of tasks) {
            try {
                const subscription = task.subscription;
                const payment = subscription?.payments?.[0];

                if (!payment) {
                    this.logger.warn(`⚠️ No active pending/overdue payment for task ${task.id}`);
                    continue;
                }

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

                // 2️⃣ Send reminder
                await this.notificationsService.sendPaymentReminder(paymentData);

                // 3️⃣ Mark as sent
                await this.prisma.task.update({
                    where: { id: task.id },
                    data: { isSent: true },
                });

                this.logger.log(`✅ Reminder sent successfully for task ${task.id}`);
            } catch (error) {
                this.logger.error(`❌ Failed to send reminder for task ${task.id}`, error.stack);
            }
        }

        this.logger.log('🏁 Daily reminder scheduler completed.');
    }
}
