-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'SPONSOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "RaffleType" AS ENUM ('REGULAR', 'SPECIAL', 'PREMIUM');

-- CreateEnum
CREATE TYPE "RaffleStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DeliveryType" AS ENUM ('DIGITAL', 'SHIPPING', 'IN_PERSON');

-- CreateEnum
CREATE TYPE "ActionType" AS ENUM ('VIDEO', 'VISIT', 'FOLLOW', 'FORM', 'COUPON');

-- CreateEnum
CREATE TYPE "BannerPosition" AS ENUM ('LEFT', 'RIGHT', 'FOOTER');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING_CLAIM', 'CLAIMED', 'DELIVERED', 'EXPIRED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "phone" TEXT,
    "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "phoneCode" TEXT,
    "province" TEXT,
    "birthDate" TIMESTAMP(3),
    "profileComplete" BOOLEAN NOT NULL DEFAULT false,
    "referralCode" TEXT NOT NULL,
    "referredById" TEXT,
    "lastLoginDay" TEXT,
    "streak" INTEGER NOT NULL DEFAULT 0,
    "registerIp" TEXT,
    "deviceId" TEXT,
    "banned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ip" TEXT,
    "deviceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sponsor" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "website" TEXT,
    "logoEmoji" TEXT NOT NULL DEFAULT '🏷️',
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sponsor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Raffle" (
    "id" TEXT NOT NULL,
    "sponsorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "prizeValue" DECIMAL(10,2) NOT NULL,
    "imageUrl" TEXT,
    "emoji" TEXT NOT NULL DEFAULT '🎁',
    "category" TEXT NOT NULL DEFAULT 'Otros',
    "type" "RaffleType" NOT NULL DEFAULT 'REGULAR',
    "status" "RaffleStatus" NOT NULL DEFAULT 'PENDING',
    "deliveryType" "DeliveryType" NOT NULL DEFAULT 'DIGITAL',
    "city" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "maxTotalTickets" INTEGER,
    "ticketCount" INTEGER NOT NULL DEFAULT 0,
    "secretSeed" TEXT NOT NULL,
    "seedHash" TEXT NOT NULL,
    "rejectReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Raffle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RaffleAction" (
    "id" TEXT NOT NULL,
    "raffleId" TEXT NOT NULL,
    "isUnlock" BOOLEAN NOT NULL DEFAULT false,
    "type" "ActionType" NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT,
    "seconds" INTEGER NOT NULL DEFAULT 0,
    "couponCode" TEXT,
    "formQuestion" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RaffleAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActionCompletion" (
    "id" TEXT NOT NULL,
    "actionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ActionCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL,
    "raffleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WildcardEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "dayKey" TEXT NOT NULL,
    "refId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WildcardEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "actionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "answer" TEXT,
    "consent" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Draw" (
    "id" TEXT NOT NULL,
    "raffleId" TEXT NOT NULL,
    "totalTickets" INTEGER NOT NULL,
    "drandRound" INTEGER,
    "drandRandomness" TEXT,
    "randomnessSource" TEXT NOT NULL,
    "winnerNumbers" INTEGER[],
    "winnerUserIds" TEXT[],
    "counters" INTEGER[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Draw_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrizeDelivery" (
    "id" TEXT NOT NULL,
    "raffleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'PENDING_CLAIM',
    "claimDeadline" TIMESTAMP(3) NOT NULL,
    "shippingAddress" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrizeDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "emailed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdBanner" (
    "id" TEXT NOT NULL,
    "advertiser" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "text" TEXT,
    "imageUrl" TEXT,
    "emoji" TEXT NOT NULL DEFAULT '📣',
    "color" TEXT NOT NULL DEFAULT '#6d28d9',
    "linkUrl" TEXT NOT NULL,
    "videoUrl" TEXT,
    "videoSeconds" INTEGER NOT NULL DEFAULT 15,
    "position" "BannerPosition" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdBanner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdView" (
    "id" TEXT NOT NULL,
    "bannerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "dayKey" TEXT NOT NULL,

    CONSTRAINT "AdView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");

-- CreateIndex
CREATE INDEX "LoginEvent_ip_idx" ON "LoginEvent"("ip");

-- CreateIndex
CREATE INDEX "LoginEvent_deviceId_idx" ON "LoginEvent"("deviceId");

-- CreateIndex
CREATE UNIQUE INDEX "Sponsor_userId_key" ON "Sponsor"("userId");

-- CreateIndex
CREATE INDEX "Raffle_status_startAt_endAt_idx" ON "Raffle"("status", "startAt", "endAt");

-- CreateIndex
CREATE UNIQUE INDEX "ActionCompletion_actionId_userId_key" ON "ActionCompletion"("actionId", "userId");

-- CreateIndex
CREATE INDEX "Ticket_raffleId_userId_idx" ON "Ticket"("raffleId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_raffleId_number_key" ON "Ticket"("raffleId", "number");

-- CreateIndex
CREATE INDEX "WildcardEntry_userId_dayKey_idx" ON "WildcardEntry"("userId", "dayKey");

-- CreateIndex
CREATE UNIQUE INDEX "Draw_raffleId_key" ON "Draw"("raffleId");

-- CreateIndex
CREATE INDEX "Notification_userId_read_idx" ON "Notification"("userId", "read");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoginEvent" ADD CONSTRAINT "LoginEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sponsor" ADD CONSTRAINT "Sponsor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Raffle" ADD CONSTRAINT "Raffle_sponsorId_fkey" FOREIGN KEY ("sponsorId") REFERENCES "Sponsor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaffleAction" ADD CONSTRAINT "RaffleAction_raffleId_fkey" FOREIGN KEY ("raffleId") REFERENCES "Raffle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionCompletion" ADD CONSTRAINT "ActionCompletion_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "RaffleAction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionCompletion" ADD CONSTRAINT "ActionCompletion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_raffleId_fkey" FOREIGN KEY ("raffleId") REFERENCES "Raffle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WildcardEntry" ADD CONSTRAINT "WildcardEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "RaffleAction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Draw" ADD CONSTRAINT "Draw_raffleId_fkey" FOREIGN KEY ("raffleId") REFERENCES "Raffle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrizeDelivery" ADD CONSTRAINT "PrizeDelivery_raffleId_fkey" FOREIGN KEY ("raffleId") REFERENCES "Raffle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrizeDelivery" ADD CONSTRAINT "PrizeDelivery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
