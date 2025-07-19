/*
  Warnings:

  - You are about to drop the column `alertTypes` on the `TripAlert` table. All the data in the column will be lost.
  - You are about to drop the column `expiresAt` on the `TripAlert` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "TripAlert" DROP COLUMN "alertTypes",
DROP COLUMN "expiresAt",
ADD COLUMN     "daysOfWeek" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- DropEnum
DROP TYPE "AlertType";

-- DropEnum
DROP TYPE "StationType";
