/*
  Warnings:

  - A unique constraint covering the columns `[email]` on the table `Funcionario` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `atualizadoEm` to the `Funcionario` table without a default value. This is not possible if the table is not empty.
  - Added the required column `senha` to the `Funcionario` table without a default value. This is not possible if the table is not empty.
  - Made the column `tipo` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "public"."StatusSaque" AS ENUM ('PENDENTE', 'PROCESSANDO', 'APROVADO', 'REJEITADO', 'CONCLUIDO');

-- DropForeignKey
ALTER TABLE "public"."Assinatura" DROP CONSTRAINT "Assinatura_usuarioId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Pagamento" DROP CONSTRAINT "Pagamento_assinaturaId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Pagamento" DROP CONSTRAINT "Pagamento_usuarioId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Venda" DROP CONSTRAINT "Venda_usuarioId_fkey";

-- AlterTable
ALTER TABLE "public"."Funcionario" ADD COLUMN     "atualizadoEm" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "senha" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "assinaturaPaga" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "colaboradorId" TEXT,
ADD COLUMN     "dataInicioTeste" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "diasTestRestantes" INTEGER NOT NULL DEFAULT 7,
ADD COLUMN     "empresa" TEXT,
ADD COLUMN     "principalId" TEXT,
ADD COLUMN     "proximoVencimento" TIMESTAMP(3),
ADD COLUMN     "statusPagamento" TEXT NOT NULL DEFAULT 'TESTE',
ADD COLUMN     "valorMensalidade" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "valorTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
ALTER COLUMN "tipo" SET NOT NULL,
ALTER COLUMN "tipo" SET DEFAULT 'PRINCIPAL';

-- CreateTable
CREATE TABLE "public"."Colaborador" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "telefone" TEXT,
    "dataAdmissao" TIMESTAMP(3),
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "dataInicioTeste" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "comissaoDisponivel" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Colaborador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MetricaColaborador" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "periodo" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "colaboradorId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MetricaColaborador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."NotificacaoColaborador" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'INFO',
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "colaboradorId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificacaoColaborador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SaqueColaborador" (
    "id" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "chavePix" TEXT NOT NULL,
    "status" "public"."StatusSaque" NOT NULL DEFAULT 'PENDENTE',
    "observacoes" TEXT,
    "emailEnviado" BOOLEAN NOT NULL DEFAULT false,
    "dataProcessamento" TIMESTAMP(3),
    "colaboradorId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SaqueColaborador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CarteiraColaborador" (
    "id" TEXT NOT NULL,
    "saldoDisponivel" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "saldoBloqueado" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalComissoes" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "clientesAtivos" INTEGER NOT NULL DEFAULT 0,
    "clientesPagantes" INTEGER NOT NULL DEFAULT 0,
    "valorComissaoMensal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ultimaAtualizacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "colaboradorId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CarteiraColaborador_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Colaborador_email_key" ON "public"."Colaborador"("email");

-- CreateIndex
CREATE UNIQUE INDEX "CarteiraColaborador_colaboradorId_key" ON "public"."CarteiraColaborador"("colaboradorId");

-- CreateIndex
CREATE UNIQUE INDEX "Funcionario_email_key" ON "public"."Funcionario"("email");

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_principalId_fkey" FOREIGN KEY ("principalId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Venda" ADD CONSTRAINT "Venda_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Assinatura" ADD CONSTRAINT "Assinatura_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Pagamento" ADD CONSTRAINT "Pagamento_assinaturaId_fkey" FOREIGN KEY ("assinaturaId") REFERENCES "public"."Assinatura"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Pagamento" ADD CONSTRAINT "Pagamento_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MetricaColaborador" ADD CONSTRAINT "MetricaColaborador_colaboradorId_fkey" FOREIGN KEY ("colaboradorId") REFERENCES "public"."Colaborador"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."NotificacaoColaborador" ADD CONSTRAINT "NotificacaoColaborador_colaboradorId_fkey" FOREIGN KEY ("colaboradorId") REFERENCES "public"."Colaborador"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SaqueColaborador" ADD CONSTRAINT "SaqueColaborador_colaboradorId_fkey" FOREIGN KEY ("colaboradorId") REFERENCES "public"."Colaborador"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CarteiraColaborador" ADD CONSTRAINT "CarteiraColaborador_colaboradorId_fkey" FOREIGN KEY ("colaboradorId") REFERENCES "public"."Colaborador"("id") ON DELETE CASCADE ON UPDATE CASCADE;
