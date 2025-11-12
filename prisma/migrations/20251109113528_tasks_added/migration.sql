-- AlterTable
ALTER TABLE `templates` MODIFY `notification_method` ENUM('WHATSAPP', 'EMAIL', 'BOTH') NULL,
    MODIFY `payment_method` ENUM('RAZORPAY', 'STRIPE') NULL;

-- CreateTable
CREATE TABLE `Task` (
    `id` VARCHAR(191) NOT NULL,
    `clientId` VARCHAR(191) NOT NULL,
    `endUserId` VARCHAR(191) NOT NULL,
    `template_id` VARCHAR(191) NOT NULL,
    `template_name` VARCHAR(191) NOT NULL,
    `template_title` VARCHAR(191) NOT NULL,
    `template_body` TEXT NOT NULL,
    `notification_date` DATETIME(3) NOT NULL,
    `notificationMethod` ENUM('WHATSAPP', 'EMAIL', 'BOTH') NULL,
    `paymentMethod` ENUM('RAZORPAY', 'STRIPE') NULL,
    `subscription_id` VARCHAR(191) NOT NULL,
    `due_date` DATETIME(3) NOT NULL,
    `paid_date` DATETIME(3) NULL,
    `amount` DECIMAL(10, 2) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Task` ADD CONSTRAINT `Task_subscription_id_fkey` FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
