-- CreateTable
CREATE TABLE "CodigoBarras" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CodigoBarras_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CodigoBarras_codigo_key" ON "CodigoBarras"("codigo");

-- AddForeignKey
ALTER TABLE "CodigoBarras" ADD CONSTRAINT "CodigoBarras_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrar dados existentes da coluna codigoBarras para a nova tabela
INSERT INTO "CodigoBarras" ("id", "codigo", "produtoId", "criadoEm")
SELECT 
    gen_random_uuid(),
    "codigoBarras",
    "id",
    CURRENT_TIMESTAMP
FROM "Produto" 
WHERE "codigoBarras" IS NOT NULL AND "codigoBarras" != '';