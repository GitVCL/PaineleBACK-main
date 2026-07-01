import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

class SaqueService {
  // Valor mínimo para saque
  static VALOR_MINIMO_SAQUE = 40.0;

  /**
   * Calcular saldo do colaborador baseado nas assinaturas ativas
   */
  async calcularSaldoColaborador(colaboradorId) {
    try {
      // Buscar clientes do colaborador com assinaturas ativas
      const clientesComAssinaturas = await prisma.user.findMany({
        where: { colaboradorId },
        include: {
          assinaturas: { where: { status: 'ATIVA' } }
        }
      });

      let saldoTotal = 0;

      // Calcular comissões fixas por assinatura ativa
      clientesComAssinaturas.forEach(cliente => {
        cliente.assinaturas.forEach(assinatura => {
          let valorPlano = 0;
          switch (assinatura.plano) {
            case 'BASICO':
              valorPlano = 89.99;
              break;
            case 'PREMIUM':
              valorPlano = 149.99;
              break;
            case 'ENTERPRISE':
              valorPlano = 299.99;
              break;
            default:
              valorPlano = 0;
          }
          saldoTotal += valorPlano * 0.5; // 50% de comissão
        });
      });

      // Subtrair saques já realizados
      const saquesRealizados = await prisma.saqueColaborador.aggregate({
        where: {
          colaboradorId,
          status: { in: ['APROVADO', 'PROCESSANDO', 'CONCLUIDO', 'PENDENTE'] }
        },
        _sum: { valor: true }
      });

      const totalSaques = saquesRealizados._sum.valor || 0;
      const saldoDisponivel = saldoTotal - totalSaques;

      return Math.max(0, saldoDisponivel); // Nunca negativo
    } catch (error) {
      console.error('Erro ao calcular saldo do colaborador:', error);
      throw new Error('Erro ao calcular saldo do colaborador');
    }
  }

  /**
   * Criar solicitação de saque
   */
  async criarSolicitacaoSaque(colaboradorId, valor, chavePix, observacoes = null) {
    try {
      if (valor < SaqueService.VALOR_MINIMO_SAQUE) {
        throw new Error(`Valor mínimo para saque é R$ ${SaqueService.VALOR_MINIMO_SAQUE.toFixed(2)}`);
      }

      const saldoDisponivel = await this.calcularSaldoColaborador(colaboradorId);

      if (saldoDisponivel < valor) {
        throw new Error('Saldo insuficiente para realizar o saque');
      }

      const saque = await prisma.saqueColaborador.create({
        data: { colaboradorId, valor, chavePix, observacoes, status: 'PENDENTE' }
      });

      return { sucesso: true, saque, mensagem: 'Solicitação de saque criada com sucesso' };
    } catch (error) {
      console.error('Erro ao criar solicitação de saque:', error);
      throw new Error(error.message || 'Erro ao criar solicitação de saque');
    }
  }

  /**
   * Listar saques do colaborador
   */
  async listarSaquesColaborador(colaboradorId, limite = 20, offset = 0) {
    try {
      const saques = await prisma.saqueColaborador.findMany({
        where: { colaboradorId },
        orderBy: { criadoEm: 'desc' },
        take: limite,
        skip: offset
      });

      const total = await prisma.saqueColaborador.count({ where: { colaboradorId } });

      return { saques, total, limite, offset };
    } catch (error) {
      console.error('Erro ao listar saques do colaborador:', error);
      throw new Error('Erro ao listar saques');
    }
  }

  /**
   * Obter resumo de saques
   */
  async obterResumoSaques(colaboradorId) {
    try {
      const totalSacado = await prisma.saqueColaborador.aggregate({
        where: { colaboradorId, status: { in: ['APROVADO', 'CONCLUIDO'] } },
        _sum: { valor: true }
      });

      const totalPendente = await prisma.saqueColaborador.aggregate({
        where: { colaboradorId, status: { in: ['PENDENTE', 'PROCESSANDO'] } },
        _sum: { valor: true }
      });

      return {
        totalSacado: totalSacado._sum.valor || 0,
        totalPendente: totalPendente._sum.valor || 0
      };
    } catch (error) {
      console.error('Erro ao obter resumo de saques:', error);
      throw new Error('Erro ao obter resumo de saques');
    }
  }

  /**
   * Atualizar status de saque
   */
  async atualizarStatusSaque(saqueId, novoStatus, observacoes = null) {
    try {
      const saque = await prisma.saqueColaborador.findUnique({ where: { id: saqueId } });
      if (!saque) throw new Error('Saque não encontrado');

      const saqueAtualizado = await prisma.saqueColaborador.update({
        where: { id: saqueId },
        data: {
          status: novoStatus,
          observacoes: observacoes || saque.observacoes,
          dataProcessamento: ['APROVADO', 'REJEITADO', 'CONCLUIDO'].includes(novoStatus)
            ? new Date()
            : saque.dataProcessamento
        }
      });

      return { sucesso: true, saque: saqueAtualizado, mensagem: `Status do saque atualizado para ${novoStatus}` };
    } catch (error) {
      console.error('Erro ao atualizar status do saque:', error);
      throw new Error(error.message || 'Erro ao atualizar status do saque');
    }
  }

  /**
   * Cancelar saque (apenas pendente)
   */
  async cancelarSaque(saqueId, colaboradorId) {
    try {
      const saque = await prisma.saqueColaborador.findFirst({
        where: { id: saqueId, colaboradorId, status: 'PENDENTE' }
      });

      if (!saque) throw new Error('Saque não encontrado ou não pode ser cancelado');

      const saqueAtualizado = await prisma.saqueColaborador.update({
        where: { id: saqueId },
        data: { status: 'REJEITADO', observacoes: 'Cancelado pelo colaborador' }
      });

      return { sucesso: true, saque: saqueAtualizado, mensagem: 'Saque cancelado com sucesso' };
    } catch (error) {
      console.error('Erro ao cancelar saque:', error);
      throw new Error(error.message || 'Erro ao cancelar saque');
    }
  }

  /**
   * Obter dados completos para página de saque
   */
  async obterDadosPaginaSaque(colaboradorId) {
    try {
      const saldoDisponivel = await this.calcularSaldoColaborador(colaboradorId);
      const resumoSaques = await this.obterResumoSaques(colaboradorId);
      const ultimosSaques = await this.listarSaquesColaborador(colaboradorId, 10);

      return {
        carteira: {
          saldoDisponivel,
          saldoBloqueado: resumoSaques.totalPendente,
          totalComissoes: saldoDisponivel + resumoSaques.totalSacado // antes dos descontos
        },
        resumoSaques,
        ultimosSaques: ultimosSaques.saques,
        valorMinimoSaque: SaqueService.VALOR_MINIMO_SAQUE
      };
    } catch (error) {
      console.error('Erro ao obter dados da página de saque:', error);
      throw new Error('Erro ao obter dados da página de saque');
    }
  }
}

export default new SaqueService();
