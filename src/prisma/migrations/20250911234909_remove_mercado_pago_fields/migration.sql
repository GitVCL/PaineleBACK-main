/*
  Warnings:

  - You are about to drop the column `mercadoPagoId` on the `Assinatura` table. All the data in the column will be lost.
  - You are about to drop the column `mercadoPagoId` on the `Pagamento` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."Assinatura_mercadoPagoId_key";

-- DropIndex
DROP INDEX "public"."Pagamento_mercadoPagoId_key";

-- AlterTable
ALTER TABLE "public"."Assinatura" DROP COLUMN "mercadoPagoId";

-- AlterTable
ALTER TABLE "public"."Pagamento" DROP COLUMN "mercadoPagoId";
