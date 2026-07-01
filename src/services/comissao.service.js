import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

class ComissaoService {
  // Valor da comissão por cliente premium por mês (50% de $149.99 = $74.995 ≈ $75)
  static COMISSAO_PREMIUM_MENSAL = 75.00;

  /**
   * Calcula comissões para um colaborador específico
   */
  async calcularComissaoColaborador(colaboradorId) {
    try {
      // Buscar todos os usuários do colaborador com plano PREMIUM e status PAGO
      const clientesPremium = await prisma.user.findMany({
        where: {
          colaboradorId: colaboradorId,
          assinatura: 'PREMIUM',
          statusPagamento: 'PAGO'
        },
        select: {
          id: true,
          nome: true,
          email: true,
          assinatura: true,
          statusPagamento: true,
          criadoEm: true
        }
      });

      const quantidadeClientesPremium = clientesPremium.length;
      const comissaoTotal = quantidadeClientesPremium * ComissaoService.COMISSAO_PREMIUM_MENSAL;

      return {
        colaboradorId,
        clientesPremium,
        quantidadeClientesPremium,
        comissaoMensal: comissaoTotal,
        valorPorCliente: ComissaoService.COMISSAO_PREMIUM_MENSAL
      };
    } catch (error) {
      console.error('Erro ao calcular comissão do colaborador:', error);
      throw new Error('Erro ao calcular comissão');
    }
  }

  /**
   * Atualiza a carteira do colaborador com as comissões calculadas
   */
  async atualizarCarteiraColaborador(colaboradorId) {
    try {
      const comissaoData = await this.calcularComissaoColaborador(colaboradorId);
      
      // Buscar ou criar carteira do colaborador
      let carteira = await prisma.carteiraColaborador.findUnique({
        where: { colaboradorId }
      });

      if (!carteira) {
        carteira = await prisma.carteiraColaborador.create({
          data: {
            colaboradorId,
            saldoDisponivel: 0,
            saldoBloqueado: 0,
            totalComissoes: 0,
            clientesAtivos: 0,
            clientesPagantes: 0,
            valorComissaoMensal: 0
          }
        });
      }

      // Atualizar dados da carteira
      const carteiraAtualizada = await prisma.carteiraColaborador.update({
        where: { colaboradorId },
        data: {
          clientesPagantes: comissaoData.quantidadeClientesPremium,
          valorComissaoMensal: comissaoData.comissaoMensal,
          ultimaAtualizacao: new Date()
        }
      });

      return {
        carteira: carteiraAtualizada,
        comissao: comissaoData
      };
    } catch (error) {
      console.error('Erro ao atualizar carteira do colaborador:', error);
      throw new Error('Erro ao atualizar carteira');
    }
  }

  /**
   * Adiciona comissão mensal à carteira do colaborador
   */
  async adicionarComissaoMensal(colaboradorId) {
    try {
      const comissaoData = await this.calcularComissaoColaborador(colaboradorId);
      
      if (comissaoData.comissaoMensal > 0) {
        // Atualizar saldo disponível e total de comissões
        const carteiraAtualizada = await prisma.carteiraColaborador.update({
          where: { colaboradorId },
          data: {
            saldoDisponivel: {
              increment: comissaoData.comissaoMensal
            },
            totalComissoes: {
              increment: comissaoData.comissaoMensal
            },
            clientesPagantes: comissaoData.quantidadeClientesPremium,
            valorComissaoMensal: comissaoData.comissaoMensal,
            ultimaAtualizacao: new Date()
          }
        });

        // Criar registro de métrica para histórico
        await prisma.metricaColaborador.create({
          data: {
            colaboradorId,
            tipo: 'COMISSAO',
            valor: comissaoData.comissaoMensal,
            periodo: 'MENSAL',
            data: new Date()
          }
        });

        return {
          sucesso: true,
          carteira: carteiraAtualizada,
          comissaoAdicionada: comissaoData.comissaoMensal,
          clientesPremium: comissaoData.quantidadeClientesPremium
        };
      }

      return {
        sucesso: false,
        mensagem: 'Nenhuma comissão a ser adicionada (sem clientes premium ativos)'
      };
    } catch (error) {
      console.error('Erro ao adicionar comissão mensal:', error);
      throw new Error('Erro ao adicionar comissão mensal');
    }
  }

  /**
   * Processa comissões mensais para todos os colaboradores
   */
  async processarComissoesMensais() {
    try {
      const colaboradores = await prisma.colaborador.findMany({
        where: { ativo: true },
        select: { id: true, nome: true, email: true }
      });

      const resultados = [];

      for (const colaborador of colaboradores) {
        try {
          const resultado = await this.adicionarComissaoMensal(colaborador.id);
          resultados.push({
            colaborador: colaborador.nome,
            ...resultado
          });
        } catch (error) {
          resultados.push({
            colaborador: colaborador.nome,
            sucesso: false,
            erro: error.message
          });
        }
      }

      return {
        totalColaboradores: colaboradores.length,
        resultados
      };
    } catch (error) {
      console.error('Erro ao processar comissões mensais:', error);
      throw new Error('Erro ao processar comissões mensais');
    }
  }

  /**
   * Obter dados da carteira do colaborador
   */
  async obterCarteiraColaborador(colaboradorId) {
    try {
      let carteira = await prisma.carteiraColaborador.findUnique({
        where: { colaboradorId },
        include: {
          colaborador: {
            select: {
              nome: true,
              email: true
            }
          }
        }
      });

      if (!carteira) {
        // Criar carteira se não existir
        carteira = await prisma.carteiraColaborador.create({
          data: {
            colaboradorId,
            saldoDisponivel: 0,
            saldoBloqueado: 0,
            totalComissoes: 0,
            clientesAtivos: 0,
            clientesPagantes: 0,
            valorComissaoMensal: 0
          },
          include: {
            colaborador: {
              select: {
                nome: true,
                email: true
              }
            }
          }
        });
      }

      // Atualizar dados em tempo real
      const comissaoAtual = await this.calcularComissaoColaborador(colaboradorId);
      
      return {
        ...carteira,
        comissaoMensalAtual: comissaoAtual.comissaoMensal,
        clientesPremiumAtivos: comissaoAtual.quantidadeClientesPremium
      };
    } catch (error) {
      console.error('Erro ao obter carteira do colaborador:', error);
      throw new Error('Erro ao obter dados da carteira');
    }
  }

  /**
   * Obter histórico de comissões do colaborador
   */
  async obterHistoricoComissoes(colaboradorId, limite = 12) {
    try {
      const historico = await prisma.metricaColaborador.findMany({
        where: {
          colaboradorId,
          tipo: 'COMISSAO'
        },
        orderBy: {
          data: 'desc'
        },
        take: limite
      });

      return historico;
    } catch (error) {
      console.error('Erro ao obter histórico de comissões:', error);
      throw new Error('Erro ao obter histórico');
    }
  }
}

export default new ComissaoService();