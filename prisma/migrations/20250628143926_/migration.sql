/*
  Warnings:

  - A unique constraint covering the columns `[deviceId]` on the table `PushSubscription` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_deviceId_key" ON "PushSubscription"("deviceId");
