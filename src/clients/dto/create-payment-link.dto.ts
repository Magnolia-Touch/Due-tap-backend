import { ApiProperty } from '@nestjs/swagger';

export class CreatePaymentLinkDto {
    @ApiProperty({ example: 50000, description: 'Amount in paise (₹500 = 50000)' })
    amount: number;

    @ApiProperty({ example: 'INR', description: 'Currency code' })
    currency: string = 'INR';

    @ApiProperty({ example: 'Payment for subscription' })
    description: string;

    @ApiProperty({ example: 'John Doe' })
    customer_name: string;

    @ApiProperty({ example: 'john@example.com' })
    customer_email: string;

    @ApiProperty({ example: '919876543210' })
    customer_contact: string;


}
