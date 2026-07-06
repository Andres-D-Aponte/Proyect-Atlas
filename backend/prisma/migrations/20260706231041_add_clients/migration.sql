-- CreateEnum
CREATE TYPE "ClientTimelineEventType" AS ENUM ('CREATED', 'UPDATED');

-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "allowBookingWithoutClient" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "requireClientAddress" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requireClientDocument" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requireClientEmail" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "clients" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "document" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_timeline_events" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "type" "ClientTimelineEventType" NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_timeline_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "clients_companyId_idx" ON "clients"("companyId");

-- CreateIndex
CREATE INDEX "client_timeline_events_clientId_idx" ON "client_timeline_events"("clientId");

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_timeline_events" ADD CONSTRAINT "client_timeline_events_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
