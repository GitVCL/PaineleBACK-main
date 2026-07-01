import prisma from '../services/prisma.service.js';

// Adicionar código de barras a um produto
export const adicionarCodigo = async (req, res) => {
  const { codigo, produtoId, dataVencimento } = req.body;

  if (!produtoId || !codigo) {
    return res.status(400).json({ error: 'Produto ID e código são obrigatórios' });
  }

  try {
    // Verificar se o produto existe e pertence ao usuário
    const produto = await prisma.produto.findFirst({
      where: {
        id: produtoId,
        usuarioId: req.usuarioId,
      },
    });

    if (!produto) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    // Verificar se o código já existe
    const codigoExistente = await Promise.all([
      // Verificar na coluna codigoBarras (compatibilidade)
      prisma.produto.findFirst({
        where: {
          codigoBarras: codigo.trim(),
          usuarioId: req.usuarioId,
        },
      }),
      // Verificar na tabela CodigoBarras
      prisma.codigoBarras.findFirst({
        where: {
          codigo: codigo.trim(),
          produto: {
            usuarioId: req.usuarioId,
          },
        },
      }),
    ]);

    if (codigoExistente.some(resultado => resultado !== null)) {
      return res.status(400).json({ error: 'Este código de barras já existe' });
    }

    // Criar novo código de barras
    const novoCodigo = await prisma.codigoBarras.create({
      data: {
        codigo: codigo.trim(),
        produtoId: produtoId,
        usuarioId: req.usuarioId,
        dataVencimento: dataVencimento ? new Date(dataVencimento) : null,
      },
    });

    res.status(201).json({ 
      message: 'Código de barras adicionado com sucesso', 
      codigoBarras: novoCodigo 
    });
  } catch (err) {
    console.error('Erro ao adicionar código de barras:', err);
    res.status(500).json({ error: 'Erro interno ao adicionar código de barras' });
  }
};

// Remover código de barras de um produto
export const removerCodigo = async (req, res) => {
  const { id } = req.params;

  try {
    // Verificar se o código existe e pertence ao usuário
    const codigoBarras = await prisma.codigoBarras.findFirst({
      where: {
        id: id,
        produto: {
          usuarioId: req.usuarioId,
        },
      },
    });

    if (!codigoBarras) {
      return res.status(404).json({ error: 'Código de barras não encontrado' });
    }

    // Remover código de barras
    await prisma.codigoBarras.delete({
      where: { id: id },
    });

    res.json({ message: 'Código de barras removido com sucesso' });
  } catch (err) {
    console.error('Erro ao remover código de barras:', err);
    res.status(500).json({ error: 'Erro interno ao remover código de barras' });
  }
};

// Listar códigos de barras de um produto
export const listarCodigosPorProduto = async (req, res) => {
  const { produtoId } = req.params;

  try {
    // Verificar se o produto existe e pertence ao usuário
    const produto = await prisma.produto.findFirst({
      where: {
        id: produtoId,
        usuarioId: req.usuarioId,
      },
      include: {
        codigosBarras: true,
      },
    });

    if (!produto) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    res.json({ 
      produto: produto.nome,
      codigosBarras: produto.codigosBarras 
    });
  } catch (err) {
    console.error('Erro ao listar códigos de barras:', err);
    res.status(500).json({ error: 'Erro interno ao listar códigos de barras' });
  }
};

export default {
  adicionarCodigo,
  removerCodigo,
  listarCodigosPorProduto,
};