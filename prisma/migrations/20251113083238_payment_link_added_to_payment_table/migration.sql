/*
  Warnings:

  - You are about to drop the column `paymentLink` on the `templates` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `payments` ADD COLUMN `paymentLink` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `templates` DROP COLUMN `paymentLink`;
