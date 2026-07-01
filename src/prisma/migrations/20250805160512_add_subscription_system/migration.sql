-- CreateEnum
CREATE TYPE "public"."PlanoTipo" AS ENUM ('GRATUITO', 'BASICO', 'PREMIUM', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "public"."StatusAssinatura" AS ENUM ('ATIVA', 'CANCELADA', 'SUSPENSA', 'EXPIRADA');

-- CreateEnum
CREATE TYPE "public"."StatusPagamento" AS ENUM ('PENDENTE', 'APROVADO', 'REJEITADO', 'CANCELADO', 'REEMBOLSADO');

-- CreateTable
CREATE TABLE "public"."Assinatura" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "plano" "public"."PlanoTipo" NOT NULL DEFAULT 'GRATUITO',
    "status" "public"."StatusAssinatura" NOT NULL DEFAULT 'ATIVA',
    "dataInicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataFim" TIMESTAMP(3),
    "precoMensal" DOUBLE PRECISION,
    "mercadoPagoId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assinatura_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Pagamento" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "assinaturaId" TEXT,
    "mercadoPagoId" TEXT NOT NULL,
    "status" "public"."StatusPagamento" NOT NULL DEFAULT 'PENDENTE',
    "valor" DOUBLE PRECISION NOT NULL,
    "moeda" TEXT NOT NULL DEFAULT 'BRL',
    "metodoPagamento" TEXT,
    "dataVencimento" TIMESTAMP(3),
    "dataPagamento" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pagamento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Assinatura_mercadoPagoId_key" ON "public"."Assinatura"("mercadoPagoId");

-- CreateIndex
CREATE UNIQUE INDEX "Pagamento_mercadoPagoId_key" ON "public"."Pagamento"("mercadoPagoId");

-- AddForeignKey
ALTER TABLE "public"."Assinatura" ADD CONSTRAINT "Assinatura_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Pagamento" ADD CONSTRAINT "Pagamento_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Pagamento" ADD CONSTRAINT "Pagamento_assinaturaId_fkey" FOREIGN KEY ("assinaturaId") REFERENCES "public"."Assinatura"("id") ON DELETE SET NULL ON UPDATE CASCADE;
