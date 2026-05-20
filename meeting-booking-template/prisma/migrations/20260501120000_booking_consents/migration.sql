-- AlterTable
ALTER TABLE `Booking` ADD COLUMN `consentPrivacyTherapistAt` DATETIME(3) NULL,
    ADD COLUMN `consentMarketingEmail` BOOLEAN NOT NULL DEFAULT false;
