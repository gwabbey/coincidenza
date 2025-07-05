/*
  Warnings:

  - You are about to drop the column `alertTypes` on the `Subscription` table. All the data in the column will be lost.
  - You are about to drop the column `trips` on the `Subscription` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "StationType" AS ENUM ('TRAIN_STATION', 'BUS_STOP');

-- CreateEnum
CREATE TYPE "TripType" AS ENUM ('TRAIN', 'BUS');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('TRIP_DELAY', 'TRIP_CANCELLATION', 'TRIP_PLATFORM_CHANGE', 'TRIP_EARLY_DEPARTURE', 'TRIP_SERVICE_UPDATE');

-- AlterTable
ALTER TABLE "Subscription" DROP COLUMN "alertTypes",
DROP COLUMN "trips";

-- CreateTable
CREATE TABLE "TripAlert" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "ids" JSONB NOT NULL DEFAULT '{}',
    "type" "TripType" NOT NULL,
    "operators" TEXT[],
    "departureStationId" TEXT NOT NULL,
    "arrivalStationId" TEXT NOT NULL,
    "departureTime" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "alertTypes" "AlertType"[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TripAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TripAlert_departureStationId_idx" ON "TripAlert"("departureStationId");

-- CreateIndex
CREATE INDEX "TripAlert_arrivalStationId_idx" ON "TripAlert"("arrivalStationId");

-- CreateIndex
CREATE INDEX "TripAlert_departureTime_idx" ON "TripAlert"("departureTime");

-- CreateIndex
CREATE INDEX "TripAlert_subscriptionId_idx" ON "TripAlert"("subscriptionId");

-- AddForeignKey
ALTER TABLE "TripAlert" ADD CONSTRAINT "TripAlert_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
