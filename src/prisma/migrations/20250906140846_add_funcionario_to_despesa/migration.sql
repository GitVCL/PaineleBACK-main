-- AlterTable
ALTER TABLE "public"."Funcionario" ADD COLUMN     "permissoes" TEXT[] DEFAULT ARRAY['vendas']::TEXT[];
