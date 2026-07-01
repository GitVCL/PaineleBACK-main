import prisma from '../services/prisma.service.js';

// Listar informações do usuário
export const obterPerfil = async (req, res) => {
  try {
    const usuarioId = req.usuarioId;
    
    const usuario = await prisma.user.findUnique({
      where: { id: usuarioId },
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        criadoEm: true,
        assinatura: true,
        planoExpiraEm: true,
        _count: {
          select: {
            produtos: true,
            vendas: true,
            assinaturas: true,
            pagamentos: true
          }
        }
      }
    });

    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json(usuario);
  } catch (error) {
    console.error('Erro ao obter perfil do usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Obter usuários vinculados ao colaborador
export const obterUsuariosPorColaborador = async (req, res) => {
  try {
    // Verificar se o usuário logado é um colaborador
    if (req.user.tipo !== 'COLABORADOR') {
      return res.status(403).json({ 
        error: 'Acesso negado. Apenas colaboradores podem acessar esta funcionalidade.' 
      });
    }

    const colaboradorId = req.user.id;
    
    const usuarios = await prisma.user.findMany({
      where: { colaboradorId },
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        assinatura: true,
        planoExpiraEm: true,
        criadoEm: true
      },
      orderBy: { criadoEm: 'desc' }
    });

    res.json(usuarios);
   } catch (error) {
     console.error('Erro ao obter usuários do colaborador:', error);
     res.status(500).json({ error: 'Erro interno do servidor' });
   }
 };

// Atualizar informações do usuário
export const atualizarPerfil = async (req, res) => {
  try {
    const usuarioId = req.usuarioId;
    const { nome, email, telefone } = req.body;

    // Verificar se o email já está em uso por outro usuário
    if (email) {
      const emailExistente = await prisma.user.findFirst({
        where: {
          email: email,
          id: { not: usuarioId }
        }
      });

      if (emailExistente) {
        return res.status(400).json({ error: 'Este email já está em uso' });
      }
    }

    const usuarioAtualizado = await prisma.user.update({
      where: { id: usuarioId },
      data: {
        ...(nome && { nome }),
        ...(email && { email }),
        ...(telefone && { telefone })
      },
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        criadoEm: true,
        assinatura: true,
        planoExpiraEm: true
      }
    });

    res.json(usuarioAtualizado);
  } catch (error) {
    console.error('Erro ao atualizar perfil do usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Excluir usuário e todos os dados relacionados
export const excluirConta = async (req, res) => {
  try {
    const usuarioId = req.usuarioId;
    const { confirmacao } = req.body;

    // Verificar se o usuário confirmou a exclusão
    if (confirmacao !== 'EXCLUIR_MINHA_CONTA') {
      return res.status(400).json({ 
        error: 'Para confirmar a exclusão, envie "confirmacao": "EXCLUIR_MINHA_CONTA"' 
      });
    }

    // Verificar se o usuário existe
    const usuario = await prisma.user.findUnique({
      where: { id: usuarioId },
      include: {
        _count: {
          produtos: true,
          vendas: true,
          assinaturas: true,
          pagamentos: true
        }
      }
    });

    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    console.log(`🗑️ Iniciando exclusão do usuário ${usuario.email}`);
    console.log(`📊 Dados a serem excluídos:`, {
      produtos: usuario._count.produtos,
      vendas: usuario._count.vendas,
      assinaturas: usuario._count.assinaturas,
      pagamentos: usuario._count.pagamentos
    });

    // Excluir o usuário (o Prisma irá excluir automaticamente todos os dados relacionados devido ao onDelete: Cascade)
    await prisma.user.delete({
      where: { id: usuarioId }
    });

    console.log(`✅ Usuário ${usuario.email} e todos os dados relacionados foram excluídos com sucesso`);

    // Limpar o cookie de autenticação
    res.clearCookie('token');

    res.json({ 
      message: 'Conta excluída com sucesso. Todos os dados relacionados foram removidos.',
      dadosExcluidos: {
        produtos: usuario._count.produtos,
        vendas: usuario._count.vendas,
        assinaturas: usuario._count.assinaturas,
        pagamentos: usuario._count.pagamentos
      }
    });

  } catch (error) {
    console.error('Erro ao excluir conta do usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Obter estatísticas da conta
export const estatisticasConta = async (req, res) => {
  try {
    const usuarioId = req.usuarioId;

    const estatisticas = await prisma.user.findUnique({
      where: { id: usuarioId },
      select: {
        id: true,
        nome: true,
        email: true,
        criadoEm: true,
        assinatura: true,
        planoExpiraEm: true,
        _count: {
          produtos: true,
          vendas: true,
          assinaturas: true,
          pagamentos: true
        },
        produtos: {
          select: {
            vendidos: true,
            valor: true,
            quantidade: true
          }
        },
        vendas: {
          select: {
            finalizada: true,
            createdAt: true,
            itensVenda: {
              select: {
                preco: true,
                quantidade: true
              }
            }
          }
        }
      }
    });

    if (!estatisticas) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Calcular estatísticas adicionais
    const totalProdutosVendidos = estatisticas.produtos.reduce((total, produto) => total + produto.vendidos, 0);
    const valorTotalEstoque = estatisticas.produtos.reduce((total, produto) => total + (produto.valor * produto.quantidade), 0);
    
    const vendasFinalizadas = estatisticas.vendas.filter(venda => venda.finalizada);
    const faturamentoTotal = vendasFinalizadas.reduce((total, venda) => {
      return total + venda.itensVenda.reduce((subtotal, item) => subtotal + (item.preco * item.quantidade), 0);
    }, 0);

    const resultado = {
      usuario: {
        id: estatisticas.id,
        nome: estatisticas.nome,
        email: estatisticas.email,
        criadoEm: estatisticas.criadoEm,
        assinatura: estatisticas.assinatura,
        planoExpiraEm: estatisticas.planoExpiraEm
      },
      contadores: estatisticas._count,
      resumo: {
        totalProdutosVendidos,
        valorTotalEstoque,
        faturamentoTotal,
        vendasFinalizadas: vendasFinalizadas.length
      }
    };

    res.json(resultado);
  } catch (error) {
    console.error('Erro ao obter estatísticas da conta:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};