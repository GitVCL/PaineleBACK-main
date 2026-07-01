-- AlterTable
ALTER TABLE "public"."Venda" ADD COLUMN     "funcionarioId" TEXT;

-- CreateTable
CREATE TABLE "public"."Funcionario" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioId" TEXT NOT NULL,

    CONSTRAINT "Funcionario_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."Funcionario" ADD CONSTRAINT "Funcionario_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Venda" ADD CONSTRAINT "Venda_funcionarioId_fkey" FOREIGN KEY ("funcionarioId") REFERENCES "public"."Funcionario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
