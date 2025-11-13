/*
  Warnings:

  - You are about to drop the column `razorpayLinkId` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `stripedLinkId` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the `razorpay_connections` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `stripe_connections` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `razorpay_connections` DROP FOREIGN KEY `razorpay_connections_client_id_fkey`;

-- DropForeignKey
ALTER TABLE `stripe_connections` DROP FOREIGN KEY `stripe_connections_client_id_fkey`;

-- DropIndex
DROP INDEX `payments_razorpayLinkId_key` ON `payments`;

-- DropIndex
DROP INDEX `payments_stripedLinkId_key` ON `payments`;

-- AlterTable
ALTER TABLE `clients` ADD COLUMN `razorpay_key_id` VARCHAR(191) NULL,
    ADD COLUMN `razorpay_key_secret` VARCHAR(191) NULL,
    ADD COLUMN `stripe_key_id` VARCHAR(191) NULL,
    ADD COLUMN `stripe_key_secret` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `payments` DROP COLUMN `razorpayLinkId`,
    DROP COLUMN `stripedLinkId`;

-- DropTable
DROP TABLE `razorpay_connections`;

-- DropTable
DROP TABLE `stripe_connections`;
