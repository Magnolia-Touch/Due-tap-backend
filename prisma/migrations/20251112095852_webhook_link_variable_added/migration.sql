/*
  Warnings:

  - A unique constraint covering the columns `[razorpayLinkId]` on the table `payments` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[stripedLinkId]` on the table `payments` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `payments` ADD COLUMN `razorpayLinkId` VARCHAR(191) NULL,
    ADD COLUMN `stripedLinkId` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `payments_razorpayLinkId_key` ON `payments`(`razorpayLinkId`);

-- CreateIndex
CREATE UNIQUE INDEX `payments_stripedLinkId_key` ON `payments`(`stripedLinkId`);
