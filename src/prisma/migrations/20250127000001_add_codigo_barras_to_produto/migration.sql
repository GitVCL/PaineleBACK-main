-- CreateIndex
-- Add codigoBarras column to Produto table
ALTER TABLE "Produto" ADD COLUMN "codigoBarras" TEXT;

-- Create unique index for codigoBarras
CREATE UNIQUE INDEX "Produto_codigoBarras_key" ON "Produto"("codigoBarras");