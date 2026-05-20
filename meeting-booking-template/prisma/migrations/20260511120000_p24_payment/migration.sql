-- AlterTable
ALTER TABLE `TherapistProfile` ADD COLUMN `sessionPricePlnGrosze` INTEGER NULL;

-- AlterTable
ALTER TABLE `Booking` ADD COLUMN `p24SessionId` VARCHAR(191) NULL,
    ADD COLUMN `p24OrderId` INTEGER NULL;
