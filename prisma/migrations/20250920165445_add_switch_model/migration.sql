-- CreateTable
CREATE TABLE "public"."Switch" (
    "id" TEXT NOT NULL,
    "hostname" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "group" TEXT NOT NULL,
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Switch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Switch_hostname_key" ON "public"."Switch"("hostname");

-- CreateIndex
CREATE UNIQUE INDEX "Switch_ipAddress_key" ON "public"."Switch"("ipAddress");
