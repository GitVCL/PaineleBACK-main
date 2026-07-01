import prisma from '../services/prisma.service.js';
import auditService from '../services/audit.service.js';

export const buscarPorCodigoBarras = async (req, res) => {
  const { codigo } = req.params;

  if (!codigo) {
    return res.status(400).json({ error: 'Código de barras é obrigatório' });
  }

  try {
    // Buscar primeiro pelo campo codigoBarras (compatibilidade)
    let produto = await prisma.produto.findFirst({
      where: {
        codigoBarras: codigo,
        usuarioId: req.usuarioId,
      },
      include: {
        codigosBarras: true, // Incluir múltiplos códigos de barras
      },
    });

    // Se não encontrou, buscar na tabela de múltiplos códigos de barras
    if (!produto) {
      const codigoBarrasEncontrado = await prisma.codigoBarras.findFirst({
        where: {
          codigo: codigo,
          produto: {
            usuarioId: req.usuarioId,
          },
        },
        include: {
          produto: {
            include: {
              codigosBarras: true,
            },
          },
        },
      });

      if (codigoBarrasEncontrado) {
        produto = codigoBarrasEncontrado.produto;
        // Adicionar informações do código de barras específico encontrado
        produto.codigoBarrasEncontrado = {
          id: codigoBarrasEncontrado.id,
          codigo: codigoBarrasEncontrado.codigo,
          dataVencimento: codigoBarrasEncontrado.dataVencimento,
        };
      }
    }

    if (!produto) {
      return res.status(404).json({ error: 'Produto não encontrado com este código de barras' });
    }

    res.json(produto);
  } catch (err) {
    console.error('Erro ao buscar produto por código de barras:', err);
    res.status(500).json({ error: 'Erro interno ao buscar produto' });
  }
};

export const listar = async (req, res) => {
  try {
    const produtos = await prisma.produto.findMany({
      where: { usuarioId: req.usuarioId },
      include: {
        codigosBarras: true, // Incluir múltiplos códigos de barras
      },
    });
    res.json(produtos);
  } catch (err) {
    console.error('Erro ao listar produtos:', err);
    res.status(500).json({ error: 'Erro ao buscar produtos' });
  }
};

export const criar = async (req, res) => {
  const { nome, valor, quantidade, estoque, categoria, valorDaCompra, lucroTotal, codigoBarras, codigosBarras } = req.body;

  // Validação mais robusta dos campos obrigatórios
  const erros = [];
  
  if (!nome || typeof nome !== 'string' || nome.trim() === '') {
    erros.push('Nome é obrigatório e deve ser uma string não vazia');
  }
  
  if (valor === undefined || valor === null || valor === '') {
    erros.push('Valor é obrigatório');
  } else {
    const valorNum = parseFloat(valor);
    if (isNaN(valorNum) || valorNum < 0) {
      erros.push('Valor deve ser um número válido maior ou igual a zero');
    }
  }
  
  if (quantidade === undefined || quantidade === null || quantidade === '') {
    erros.push('Quantidade é obrigatória');
  } else {
    const quantidadeNum = parseInt(quantidade);
    if (isNaN(quantidadeNum) || quantidadeNum < 0) {
      erros.push('Quantidade deve ser um número inteiro maior ou igual a zero');
    }
  }
  
  if (estoque === undefined || estoque === null || estoque === '') {
    erros.push('Estoque é obrigatório');
  } else {
    const estoqueNum = parseInt(estoque);
    if (isNaN(estoqueNum) || estoqueNum < 0) {
      erros.push('Estoque deve ser um número inteiro maior ou igual a zero');
    }
  }
  
  if (!categoria || typeof categoria !== 'string' || categoria.trim() === '') {
    erros.push('Categoria é obrigatória e deve ser uma string não vazia');
  }

  if (erros.length > 0) {
    return res.status(400).json({ 
      error: 'Dados inválidos para criação do produto',
      detalhes: erros
    });
  }

  try {
    // Verificar se algum código de barras já existe
    const codigosParaVerificar = [];
    
    // Adicionar código de barras único (compatibilidade)
    if (codigoBarras && codigoBarras.trim() !== '') {
      codigosParaVerificar.push(codigoBarras.trim());
    }
    
    // Adicionar múltiplos códigos de barras
    if (codigosBarras && Array.isArray(codigosBarras)) {
      codigosBarras.forEach(item => {
        // Suportar tanto string quanto objeto {codigo, dataVencimento}
        const codigo = typeof item === 'string' ? item : item.codigo;
        if (codigo && codigo.trim() !== '') {
          codigosParaVerificar.push(codigo.trim());
        }
      });
    }

    // Verificar duplicatas nos códigos fornecidos
    const codigosUnicos = [...new Set(codigosParaVerificar)];
    if (codigosUnicos.length !== codigosParaVerificar.length) {
      return res.status(400).json({ error: 'Códigos de barras duplicados fornecidos' });
    }

    // Verificar se algum código já existe no banco
    if (codigosUnicos.length > 0) {
      // Verificar na coluna codigoBarras (compatibilidade)
      const produtoComCodigoExistente = await prisma.produto.findFirst({
        where: {
          codigoBarras: { in: codigosUnicos },
          usuarioId: req.usuarioId,
        },
      });
      
      // Verificar na tabela CodigoBarras
      const codigoBarrasExistente = await prisma.codigoBarras.findFirst({
        where: {
          codigo: { in: codigosUnicos },
          produto: {
            usuarioId: req.usuarioId,
          },
        },
      });

      if (produtoComCodigoExistente || codigoBarrasExistente) {
        return res.status(400).json({ error: 'Um ou mais códigos de barras já existem' });
      }
    }

    const valorNum = parseFloat(valor) || 0;
    const compraNum = parseFloat(valorDaCompra) || 0;
    const quantidadeNum = parseInt(quantidade) || 0;
    const estoqueNum = parseInt(estoque) || 0;

    // Calcula sempre a porcentagem de lucro baseada nos valores de venda e compra
    const lucroPercentual = (compraNum > 0 && valorNum > 0) ? 
      ((valorNum - compraNum) / compraNum) * 100 : 0;

    const novo = await prisma.produto.create({
      data: {
        nome: nome.trim(),
        valor: valorNum,
        quantidade: quantidadeNum,
        estoque: estoqueNum,
        categoria: categoria.trim(),
        valorDaCompra: compraNum,
        lucroTotal: lucroPercentual,
        codigoBarras: codigoBarras && codigoBarras.trim() !== '' ? codigoBarras.trim() : null,
        usuarioId: req.usuarioId,
        codigosBarras: {
          create: codigosBarras && Array.isArray(codigosBarras) && codigosBarras.length > 0 
            ? codigosBarras.map(item => {
                const codigo = typeof item === 'string' ? item : item.codigo;
                let dataVencimento = null;
                
                // Processar data de vencimento se fornecida
                if (typeof item === 'object' && item.dataVencimento) {
                  try {
                    // Se a data está no formato YYYY-MM-DD, converter para DateTime ISO-8601
                    if (typeof item.dataVencimento === 'string') {
                      // Adicionar horário padrão se apenas data foi fornecida
                      const dateStr = item.dataVencimento.includes('T') 
                        ? item.dataVencimento 
                        : `${item.dataVencimento}T00:00:00.000Z`;
                      
                      dataVencimento = new Date(dateStr);
                      
                      // Verificar se a data é válida
                      if (isNaN(dataVencimento.getTime())) {
                        dataVencimento = null;
                      }
                    } else if (item.dataVencimento instanceof Date) {
                      dataVencimento = item.dataVencimento;
                    }
                  } catch (error) {
                    console.log('Erro ao processar data de vencimento:', error);
                    dataVencimento = null;
                  }
                }
                
                return {
                  codigo: codigo.trim(),
                  usuarioId: req.usuarioId,
                  dataVencimento: dataVencimento,
                };
              })
            : [], // Se não há códigos múltiplos, criar array vazio
        },
      },
      include: {
        codigosBarras: true,
      },
    });

    // Registrar movimentação no novo console
    await auditService.registrar(req, {
      acao: 'CRIAR_PRODUTO',
      categoria: 'PRODUTOS',
      entidade: 'Produto',
      entidadeId: novo.id,
      descricao: `Produto criado: ${nome}`,
      metadata: {
        valor: valorNum,
        quantidade: quantidadeNum,
        estoque: estoqueNum,
        codigoBarras,
        codigosBarras: novo.codigosBarras || []
      }
    });

    // Criar despesa automaticamente se houver valor de compra e quantidade atual
    if (compraNum > 0 && quantidadeNum > 0) {
      const valorTotalDespesa = compraNum * quantidadeNum;
      
      try {
        const autorCompra = req.funcionario?.nome || req.user?.nome || 'Sistema';
        await prisma.despesa.create({
          data: {
            descricao: `${nome} (compra) (por: ${autorCompra})`,
            valor: valorTotalDespesa,
            categoria: 'produtos',
            data: new Date(),
            usuarioId: req.usuarioId,
          },
        });
      } catch (despesaErr) {
        console.error('Erro ao criar despesa automática:', despesaErr);
        // Não falha a criação do produto se a despesa falhar
      }
    }

    // Log do funcionário responsável pela criação
    if (req.funcionario) {
      console.log(`📦 Produto criado por funcionário: ${req.funcionario.nome} (ID: ${req.funcionario.id}) - Produto: ${nome} (ID: ${novo.id})`);
    } else if (req.user) {
      console.log(`📦 Produto criado por usuário: ${req.user.nome || 'N/A'} (ID: ${req.user.id}) - Produto: ${nome} (ID: ${novo.id})`);
    }

    res.status(201).json({ message: 'Produto criado com sucesso', produto: novo });
  } catch (err) {
    console.error('Erro ao criar produto:', err);
    
    // Tratamento específico de erros do Prisma
    if (err.code === 'P2002') {
      return res.status(400).json({ 
        error: 'Já existe um produto com estes dados únicos (código de barras ou nome)',
      });
    }
    
    if (err.code === 'P2003') {
      return res.status(400).json({ 
        error: 'Referência inválida: verifique os dados do usuário',
      });
    }
    
    // Erro genérico mais amigável
    res.status(500).json({ 
      error: 'Erro interno do servidor ao criar produto. Tente novamente em alguns instantes.',
      codigo: err.code || 'ERRO_INTERNO'
    });
  }
};

export const atualizar = async (req, res) => {
  const { nome, valor, quantidade, estoque, categoria, valorDaCompra, lucroTotal, codigoBarras, codigosBarras } = req.body;
  const produtoId = req.params.id;

  try {
    const produto = await prisma.produto.findUnique({ 
      where: { id: produtoId },
      include: { codigosBarras: true },
    });
    
    if (!produto || produto.usuarioId !== req.usuarioId) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    // Verificar se algum código de barras já existe em outros produtos
    const codigosParaVerificar = [];
    
    // Adicionar código de barras único (compatibilidade)
    if (codigoBarras && codigoBarras.trim() !== '') {
      codigosParaVerificar.push(codigoBarras.trim());
    }
    
    // Adicionar múltiplos códigos de barras
    if (codigosBarras && Array.isArray(codigosBarras)) {
      codigosBarras.forEach(item => {
        // Suportar tanto string quanto objeto {codigo, dataVencimento}
        const codigo = typeof item === 'string' ? item : item.codigo;
        if (codigo && codigo.trim() !== '') {
          codigosParaVerificar.push(codigo.trim());
        }
      });
    }

    // Verificar duplicatas nos códigos fornecidos
    const codigosUnicos = [...new Set(codigosParaVerificar)];
    if (codigosUnicos.length !== codigosParaVerificar.length) {
      return res.status(400).json({ error: 'Códigos de barras duplicados fornecidos' });
    }

    // Verificar se algum código já existe em outros produtos
    if (codigosUnicos.length > 0) {
      const codigosExistentes = await Promise.all([
        // Verificar na coluna codigoBarras (compatibilidade)
        prisma.produto.findFirst({
          where: {
            codigoBarras: { in: codigosUnicos },
            usuarioId: req.usuarioId,
            id: { not: produtoId }, // Excluir o produto atual
          },
        }),
        // Verificar na tabela CodigoBarras
        prisma.codigoBarras.findFirst({
          where: {
            codigo: { in: codigosUnicos },
            produto: {
              usuarioId: req.usuarioId,
              id: { not: produtoId }, // Excluir o produto atual
            },
          },
        }),
      ]);

      if (codigosExistentes.some(resultado => resultado !== null)) {
        return res.status(400).json({ error: 'Um ou mais códigos de barras já existem em outros produtos' });
      }
    }

    const valorNum = parseFloat(valor) || 0;
    const compraNum = parseFloat(valorDaCompra) || 0;
    const quantidadeNum = parseInt(quantidade) || 0;
    const estoqueNum = parseInt(estoque) || 0;

    // Calcula sempre a porcentagem de lucro baseada nos valores de venda e compra
    const lucroPercentual = (compraNum > 0 && valorNum > 0) ? 
      ((valorNum - compraNum) / compraNum) * 100 : 0;

    // Atualizar produto e gerenciar códigos de barras
    const atualizado = await prisma.$transaction(async (prisma) => {
      // Deletar códigos de barras existentes
      await prisma.codigoBarras.deleteMany({
        where: { produtoId: produtoId },
      });

      // Atualizar produto
      const updateData = {
        nome,
        valor: valorNum,
        quantidade: quantidadeNum,
        estoque: estoqueNum,
        categoria,
        valorDaCompra: compraNum,
        lucroTotal: lucroPercentual,
        codigoBarras: codigoBarras || null,
      };

      // Só adicionar codigosBarras se houver códigos para criar
      if (codigosBarras && Array.isArray(codigosBarras) && codigosBarras.length > 0) {
        // Primeiro, remover todos os códigos existentes
        await prisma.codigoBarras.deleteMany({
          where: {
            produtoId: produtoId,
            usuarioId: req.usuarioId,
          },
        });

        // Depois, criar os novos códigos
        updateData.codigosBarras = {
          create: codigosBarras.map(item => {
            const codigo = typeof item === 'string' ? item : item.codigo;
            
            // Converter data de vencimento para formato ISO se necessário
            let dataVencimento = null;
            if (typeof item === 'object' && item.dataVencimento) {
              const data = item.dataVencimento;
              // Se a data está no formato YYYY-MM-DD, converter para ISO
              if (typeof data === 'string' && data.match(/^\d{4}-\d{2}-\d{2}$/)) {
                dataVencimento = new Date(data + 'T00:00:00.000Z');
              } else {
                dataVencimento = new Date(data);
              }
            }
            
            return {
              codigo: codigo.trim(),
              usuarioId: req.usuarioId,
              dataVencimento: dataVencimento,
            };
          }),
        };
      } else {
        // Se não há códigos múltiplos, remover todos os existentes
        await prisma.codigoBarras.deleteMany({
          where: {
            produtoId: produtoId,
            usuarioId: req.usuarioId,
          },
        });
      }

      const produtoAtualizado = await prisma.produto.update({
        where: { id: produtoId },
        data: updateData,
        include: {
          codigosBarras: true,
        },
      });

      return produtoAtualizado;
    });

    // Log do funcionário responsável pela atualização
    if (req.funcionario) {
      console.log(`📝 Produto atualizado por funcionário: ${req.funcionario.nome} (ID: ${req.funcionario.id}) - Produto: ${atualizado.nome} (ID: ${atualizado.id})`);
    } else if (req.user) {
      console.log(`📝 Produto atualizado por usuário: ${req.user.nome || 'N/A'} (ID: ${req.user.id}) - Produto: ${atualizado.nome} (ID: ${atualizado.id})`);
    }

    // Registrar log de movimentação de produto (atualização)
    try {
      const autor = req.funcionario?.nome || req.user?.nome || 'Sistema';
      await prisma.despesa.create({
        data: {
          descricao: `Produto atualizado: ${atualizado.nome} (por: ${autor})`,
          valor: 0,
          categoria: 'LOG_PRODUTO',
          data: new Date(),
          usuarioId: req.usuarioId,
        },
      });
    } catch (logErr) {
      console.warn('Falha ao registrar log de produto (atualização):', logErr);
    }

    res.json({ message: 'Produto atualizado com sucesso', produto: atualizado });
  } catch (err) {
    console.error('Erro ao atualizar produto:', err);
    res.status(500).json({ error: 'Erro interno ao atualizar produto' });
  }
};

export const deletar = async (req, res) => {
  const produtoId = req.params.id;

  try {
    const produto = await prisma.produto.findUnique({ where: { id: produtoId } });
    if (!produto || produto.usuarioId !== req.usuarioId) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    await prisma.produto.delete({ where: { id: produtoId } });
    res.json({ message: 'Produto deletado' });
  } catch (err) {
    console.error('Erro ao deletar produto:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
};

export const fundirDuplicadosAutomatico = async (req, res) => {
  try {
    const produtos = await prisma.produto.findMany({
      where: { usuarioId: req.usuarioId },
      orderBy: { nome: 'asc' }
    });

    // Agrupar produtos por nome (case insensitive)
    const gruposProdutos = {};
    produtos.forEach(produto => {
      const nomeKey = produto.nome.toLowerCase().trim();
      if (!gruposProdutos[nomeKey]) {
        gruposProdutos[nomeKey] = [];
      }
      gruposProdutos[nomeKey].push(produto);
    });

    let fusoesSucesso = 0;
    let fusoesFalha = 0;

    // Processar cada grupo de produtos duplicados
    for (const [nome, grupo] of Object.entries(gruposProdutos)) {
      if (grupo.length > 1) {
        // Separar produtos com quantidade 0 e com estoque
        const produtosComEstoque = grupo.filter(p => p.quantidade > 0);
        const produtosSemEstoque = grupo.filter(p => p.quantidade === 0);

        if (produtosComEstoque.length > 0 && produtosSemEstoque.length > 0) {
          // Escolher o produto com maior estoque como principal
          const produtoPrincipal = produtosComEstoque.reduce((prev, current) => 
            (prev.quantidade > current.quantidade) ? prev : current
          );

          // Fundir todos os produtos sem estoque com o principal
          for (const produtoSemEstoque of produtosSemEstoque) {
            try {
              // Atualizar itens de venda do produto sem estoque para o principal
              await prisma.itemVenda.updateMany({
                where: { produtoId: produtoSemEstoque.id },
                data: { produtoId: produtoPrincipal.id },
              });

              // Somar vendidos do produto sem estoque ao principal
              await prisma.produto.update({
                where: { id: produtoPrincipal.id },
                data: {
                  vendidos: {
                    increment: produtoSemEstoque.vendidos || 0
                  }
                },
              });

              // Deletar o produto sem estoque
              await prisma.produto.delete({ 
                where: { id: produtoSemEstoque.id } 
              });

              fusoesSucesso++;
            } catch (err) {
              console.error(`Erro ao fundir produto ${produtoSemEstoque.id}:`, err);
              fusoesFalha++;
            }
          }
        }
      }
    }

    res.json({ 
      message: `Fusão automática concluída. ${fusoesSucesso} produtos fundidos com sucesso, ${fusoesFalha} falhas.`,
      fusoesSucesso,
      fusoesFalha
    });
  } catch (err) {
    console.error('Erro na fusão automática:', err);
    res.status(500).json({ error: 'Erro interno na fusão automática de produtos.' });
  }
};

export const fundirDuplicado = async (req, res) => {
  const { produtoOriginalId, produtoDuplicadoId } = req.body;

  if (!produtoOriginalId || !produtoDuplicadoId) {
    return res.status(400).json({ error: 'IDs dos produtos são obrigatórios.' });
  }

  try {
    const [produtoOriginal, produtoDuplicado] = await Promise.all([
      prisma.produto.findUnique({ where: { id: produtoOriginalId } }),
      prisma.produto.findUnique({ where: { id: produtoDuplicadoId } }),
    ]);

    if (
      !produtoOriginal ||
      !produtoDuplicado ||
      produtoOriginal.usuarioId !== req.usuarioId ||
      produtoDuplicado.usuarioId !== req.usuarioId
    ) {
      return res.status(403).json({ error: 'Acesso negado aos produtos.' });
    }

    // Validar se o produto duplicado tem quantidade 0
    if (produtoDuplicado.quantidade > 0) {
      return res.status(400).json({ 
        error: 'Só é possível unificar produtos quando o produto que vai ser integrado estiver com quantidade 0.' 
      });
    }

    // Atualiza os itens de venda do duplicado para o original
    await prisma.itemVenda.updateMany({
      where: { produtoId: produtoDuplicadoId },
      data: { produtoId: produtoOriginalId },
    });

    // Soma as quantidades e vendidos
    const novaQuantidade = produtoOriginal.quantidade + produtoDuplicado.quantidade;
    const novosVendidos = (produtoOriginal.vendidos || 0) + (produtoDuplicado.vendidos || 0);

    await prisma.produto.update({
      where: { id: produtoOriginalId },
      data: {
        quantidade: novaQuantidade,
        vendidos: novosVendidos,
      },
    });

    // Deleta o duplicado
    await prisma.produto.delete({ where: { id: produtoDuplicadoId } });

    res.json({ message: 'Produtos fundidos com sucesso.' });
  } catch (err) {
    console.error('Erro ao fundir produtos:', err);
    res.status(500).json({ error: 'Erro interno ao fundir produtos.' });
  }
};

export const unificarLotesAutomatico = async (req, res) => {
  try {
    const produtos = await prisma.produto.findMany({
      where: { usuarioId: req.usuarioId },
      orderBy: { nome: 'asc' }
    });

    // Agrupar produtos por nome (case insensitive)
    const gruposProdutos = {};
    produtos.forEach(produto => {
      const nomeKey = produto.nome.toLowerCase().trim();
      if (!gruposProdutos[nomeKey]) {
        gruposProdutos[nomeKey] = [];
      }
      gruposProdutos[nomeKey].push(produto);
    });

    let unificacoesSucesso = 0;
    const resultados = [];

    // Processar cada grupo de produtos
    for (const [nome, grupo] of Object.entries(gruposProdutos)) {
      if (grupo.length > 1) {
        // Separar produtos com quantidade 0 e com estoque
        const produtosComEstoque = grupo.filter(p => p.quantidade > 0);
        const produtosSemEstoque = grupo.filter(p => p.quantidade === 0);

        if (produtosComEstoque.length > 0 && produtosSemEstoque.length > 0) {
          // Escolher o produto com maior estoque como principal
          const produtoPrincipal = produtosComEstoque.reduce((prev, current) => 
            (prev.quantidade > current.quantidade) ? prev : current
          );

          // Unificar todos os produtos sem estoque com o principal
          for (const produtoSemEstoque of produtosSemEstoque) {
            try {
              // Atualizar itens de venda do produto sem estoque para o principal
              await prisma.itemVenda.updateMany({
                where: { produtoId: produtoSemEstoque.id },
                data: { produtoId: produtoPrincipal.id },
              });

              // Somar vendidos do produto sem estoque ao principal
              await prisma.produto.update({
                where: { id: produtoPrincipal.id },
                data: {
                  vendidos: {
                    increment: produtoSemEstoque.vendidos || 0
                  }
                },
              });

              // Deletar o produto sem estoque
              await prisma.produto.delete({ 
                where: { id: produtoSemEstoque.id } 
              });

              unificacoesSucesso++;
              resultados.push({
                produtoUnificado: produtoSemEstoque.nome,
                idUnificado: produtoSemEstoque.id,
                produtoPrincipal: produtoPrincipal.nome,
                idPrincipal: produtoPrincipal.id
              });
            } catch (err) {
              console.error(`❌ Erro ao unificar produto ${produtoSemEstoque.id}:`, err);
              resultados.push({
                erro: `Erro ao unificar ${produtoSemEstoque.nome}`,
                detalhes: err.message
              });
            }
          }
        }
      }
    }

    res.json({
      message: `Unificação automática concluída: ${unificacoesSucesso} produtos unificados`,
      unificacoesSucesso,
      resultados
    });

  } catch (err) {
    console.error('❌ Erro na unificação automática:', err);
    res.status(500).json({ 
      error: 'Erro interno na unificação automática',
      detalhes: err.message 
    });
  }
};

export default {
  listar,
  buscarPorCodigoBarras,
  criar,
  atualizar,
  deletar,
  fundirDuplicado,
  fundirDuplicadosAutomatico,
  unificarLotesAutomatico,
};
