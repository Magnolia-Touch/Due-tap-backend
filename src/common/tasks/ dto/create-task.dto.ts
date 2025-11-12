import {
    IsString,
    IsOptional,
    IsDateString,
    IsBoolean,
    IsNumber,
} from 'class-validator';
import { NotificationMethod, PaymentMethod } from '@prisma/client';

export class CreateTaskDto {
    @IsString()
    clientId: string;

    @IsString()
    endUserId: string;

    @IsString()
    templateId: string;

    @IsString()
    templateName: string;

    @IsString()
    templateTitle: string;

    @IsString()
    templateBody: string;

    @IsOptional()
    @IsString()
    paymentLink?: string;

    @IsDateString()
    notificationDate: string;

    @IsOptional()
    @IsBoolean()
    isSent?: boolean;

    @IsOptional()
    notificationMethod?: NotificationMethod;

    @IsOptional()
    paymentMethod?: PaymentMethod;

    @IsString()
    subscriptionId: string;

    @IsOptional()
    @IsString()
    paymentId?: string;

    @IsDateString()
    dueDate: string;

    @IsOptional()
    @IsDateString()
    paidDate?: string;

    @IsNumber()
    amount: number;
}
