-- AlterTable
ALTER TABLE "public"."Assinatura" ADD COLUMN     "paymentLinkId" TEXT;

-- CreateTable
CREATE TABLE "public"."PaymentLink" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "PaymentLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentLink_url_key" ON "public"."PaymentLink"("url");

-- AddForeignKey
ALTER TABLE "public"."Assinatura" ADD CONSTRAINT "Assinatura_paymentLinkId_fkey" FOREIGN KEY ("paymentLinkId") REFERENCES "public"."PaymentLink"("id") ON DELETE SET NULL ON UPDATE CASCADE;
