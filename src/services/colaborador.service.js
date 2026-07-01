import bcrypt from 'bcrypt';
import prisma from './prisma.service.js';
import { gerarToken } from '../utils/token.js';

const colaboradorService = {
  registrar: async ({ nome, email, senha, telefone }) => {
    try {
      // Verificar se o e-mail já existe
      const colaboradorExistente = await prisma.colaborador.findUnique({
        where: { email },
        select: { id: true }
      });

      if (colaboradorExistente) {
        return { 
          status: 400, 
          message: 'E-mail já cadastrado' 
        };
      }

      // Hash da senha
      const senhaHash = await bcrypt.hash(senha, 10);

      try {
        // Criar colaborador
        const colaborador = await prisma.colaborador.create({
          data: {
            nome,
            email,
            senha: senhaHash,
            telefone: telefone || null,
            ativo: true,
            dataAdmissao: new Date(),
            dataInicioTeste: new Date(),
            comissaoDisponivel: 0.0
          },
          select: {
            id: true,
            nome: true,
            email: true
          }
        });

        // Criar carteira do colaborador automaticamente
        await prisma.carteiraColaborador.create({
          data: {
            colaboradorId: colaborador.id,
            saldoDisponivel: 0.0,
            saldoBloqueado: 0.0,
            totalComissoes: 0.0,
            clientesAtivos: 0,
            clientesPagantes: 0,
            valorComissaoMensal: 0.0
          }
        });

        return { 
          status: 201, 
          message: 'Colaborador cadastrado com sucesso', 
          colaborador: { 
            id: colaborador.id,
            nome: colaborador.nome,
            email: colaborador.email
          } 
        };
      } catch (prismaError) {
        console.error('Erro específico do Prisma:', prismaError);
        return { 
          status: 500, 
          message: `Erro ao criar colaborador no banco: ${prismaError.message}` 
        };
      }
    } catch (error) {
      console.error('Erro ao registrar colaborador:', error);
      return { 
        status: 500, 
        message: `Erro ao registrar: ${error.message || 'Erro interno do servidor'}` 
      };
    }
  },

  login: async ({ email, senha }) => {
    try {
      // Buscar colaborador na tabela Colaborador
      const colaborador = await prisma.colaborador.findUnique({ 
        where: { email },
        select: {
          id: true,
          nome: true,
          email: true,
          senha: true,
          ativo: true,
          telefone: true,
          dataAdmissao: true
        }
      });
      
      if (!colaborador) {
        return { 
          response: { 
            status: 401, 
            message: 'Credenciais inválidas' 
          } 
        };
      }

      // Verificar senha
      const senhaOk = await bcrypt.compare(senha, colaborador.senha);
      if (!senhaOk) {
        return { 
          response: { 
            status: 401, 
            message: 'Senha incorreta' 
          } 
        };
      }

      // Verificar se colaborador está ativo
      if (!colaborador.ativo) {
        return {
          response: {
            status: 403,
            message: 'Colaborador inativo. Entre em contato com o administrador.'
          }
        };
      }

      // Gerar token com dados do colaborador
      const token = gerarToken({ 
        usuarioId: colaborador.id, // Campo obrigatório para o middleware
        id: colaborador.id, 
        email: colaborador.email, 
        tipo: 'COLABORADOR',
        nome: colaborador.nome,
        role: 'COLABORADOR'
      });

      return {
        response: {
          status: 200,
          message: 'Login efetuado com sucesso',
          colaborador: {
            id: colaborador.id,
            nome: colaborador.nome,
            email: colaborador.email,
            tipo: 'COLABORADOR',
            telefone: colaborador.telefone,
            dataAdmissao: colaborador.dataAdmissao
          }
        },
        token
      };
    } catch (error) {
      console.error('Erro no login do colaborador:', error);
      return { 
        response: { 
          status: 500, 
          message: 'Erro interno do servidor' 
        } 
      };
    }
  },

  // Novas funcionalidades migradas do backend do colaborador
  calcularMetricas: async (colaboradorId) => {
    try {
      const MENSALIDADE_BASE = 1.99;
      const PERCENTUAL_COMISSAO = 0.5;
      
      // Buscar usuários cadastrados pelo colaborador
      const clientes = await prisma.user.findMany({
        where: { colaboradorId },
        select: {
          id: true,
          nome: true,
          email: true,
          assinatura: true,
          planoExpiraEm: true,
          criadoEm: true
        }
      });
      
      // Calcular métricas
      const clientesAtivos = clientes.filter(cliente => {
        if (cliente.assinatura === 'gratuito') return false;
        if (!cliente.planoExpiraEm) return true;
        return new Date(cliente.planoExpiraEm) > new Date();
      }).length;
      
      const totalClientes = clientes.length;
      const valorTotalFaturado = totalClientes * MENSALIDADE_BASE * PERCENTUAL_COMISSAO;
      const valorMensalAtual = clientesAtivos * MENSALIDADE_BASE * PERCENTUAL_COMISSAO;
      const aplicativoMaisVendido = 'Painelé';
      
      return {
        valorTotalFaturado,
        valorMensalAtual,
        clientesAtivos,
        aplicativoMaisVendido,
        totalClientes
      };
    } catch (error) {
      console.error('Erro ao calcular métricas:', error);
      throw error;
    }
  },

  obterVendas: async (colaboradorId, page = 1, limit = 10) => {
    try {
      const offset = (page - 1) * limit;
      
      // Buscar usuários cadastrados pelo colaborador como "vendas"
      const vendas = await prisma.user.findMany({
        where: { colaboradorId },
        select: {
          id: true,
          nome: true,
          email: true,
          assinatura: true,
          criadoEm: true
        },
        orderBy: { criadoEm: 'desc' },
        skip: offset,
        take: parseInt(limit)
      });
      
      const total = await prisma.user.count({
        where: { colaboradorId }
      });
      
      return {
        vendas: vendas.map(venda => ({
          id: venda.id,
          cliente: venda.nome,
          email: venda.email,
          plano: venda.assinatura,
          valor: 1.99,
          data: venda.criadoEm,
          status: 'concluida'
        })),
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      console.error('Erro ao obter vendas:', error);
      throw error;
    }
  },

  obterClientes: async (colaboradorId) => {
    try {
      const clientes = await prisma.user.findMany({
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
      
      return clientes.map(cliente => ({
        id: cliente.id,
        nome: cliente.nome,
        email: cliente.email,
        telefone: cliente.telefone,
        plano: cliente.assinatura,
        status: cliente.assinatura === 'gratuito' ? 'gratuito' : 
                (!cliente.planoExpiraEm || new Date(cliente.planoExpiraEm) > new Date()) ? 'ativo' : 'inativo',
        dataRegistro: cliente.criadoEm,
        proximoVencimento: cliente.planoExpiraEm
      }));
    } catch (error) {
      console.error('Erro ao obter clientes:', error);
      throw error;
    }
  },

  gerarRelatorios: async (colaboradorId, periodo) => {
    try {
      const agora = new Date();
      let dataInicio;
      
      switch (periodo) {
        case 'semanal':
          dataInicio = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'mensal':
          dataInicio = new Date(agora.getFullYear(), agora.getMonth(), 1);
          break;
        case 'anual':
          dataInicio = new Date(agora.getFullYear(), 0, 1);
          break;
        default:
          dataInicio = new Date(agora.getFullYear(), agora.getMonth(), 1);
      }
      
      const clientes = await prisma.user.findMany({
        where: {
          colaboradorId,
          criadoEm: {
            gte: dataInicio
          }
        },
        select: {
          id: true,
          nome: true,
          assinatura: true,
          criadoEm: true
        }
      });
      
      const totalVendas = clientes.length;
      const faturamento = totalVendas * 1.99 * 0.5;
      
      return {
        periodo,
        totalVendas,
        faturamento,
        clientesNovos: totalVendas,
        crescimento: 0 // Placeholder
      };
    } catch (error) {
      console.error('Erro ao gerar relatórios:', error);
      throw error;
    }
  },

  obterNotificacoes: async (colaboradorId) => {
    try {
      const notificacoes = await prisma.notificacaoColaborador.findMany({
        where: { colaboradorId },
        orderBy: { criadoEm: 'desc' }
      });
      
      return notificacoes.map(notificacao => ({
        id: notificacao.id,
        titulo: notificacao.titulo,
        mensagem: notificacao.mensagem,
        tipo: notificacao.tipo.toLowerCase(),
        lida: notificacao.lida,
        criadoEm: notificacao.criadoEm
      }));
    } catch (error) {
      console.error('Erro ao obter notificações:', error);
      throw error;
    }
  },

  marcarNotificacaoLida: async (colaboradorId, notificacaoId) => {
    try {
      await prisma.notificacaoColaborador.updateMany({
        where: {
          id: notificacaoId,
          colaboradorId
        },
        data: {
          lida: true
        }
      });
      
      return { success: true };
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
      throw error;
    }
  }
};

export default colaboradorService;