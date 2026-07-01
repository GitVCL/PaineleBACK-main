import comissaoService from '../services/comissao.service.js';
import { getColaborador } from '../utils/colaborador.js';

class ComissaoController {
  /**
   * Obter dados da carteira do colaborador
   */
  async obterCarteira(req, res) {
    try {
      const colaborador = getColaborador(req);
      
      const carteira = await comissaoService.obterCarteiraColaborador(colaborador.id);
      
      res.json({
        sucesso: true,
        carteira
      });
    } catch (error) {
      console.error('Erro ao obter carteira:', error);
      res.status(500).json({
        sucesso: false,
        mensagem: error.message || 'Erro interno do servidor'
      });
    }
  }

  /**
   * Calcular comissão atual do colaborador
   */
  async calcularComissao(req, res) {
    try {
      const colaborador = getColaborador(req);
      
      const comissao = await comissaoService.calcularComissaoColaborador(colaborador.id);
      
      res.json({
        sucesso: true,
        comissao
      });
    } catch (error) {
      console.error('Erro ao calcular comissão:', error);
      res.status(500).json({
        sucesso: false,
        mensagem: error.message || 'Erro interno do servidor'
      });
    }
  }

  /**
   * Atualizar carteira do colaborador
   */
  async atualizarCarteira(req, res) {
    try {
      const colaborador = getColaborador(req);
      
      const resultado = await comissaoService.atualizarCarteiraColaborador(colaborador.id);
      
      res.json({
        sucesso: true,
        ...resultado
      });
    } catch (error) {
      console.error('Erro ao atualizar carteira:', error);
      res.status(500).json({
        sucesso: false,
        mensagem: error.message || 'Erro interno do servidor'
      });
    }
  }

  /**
   * Obter histórico de comissões
   */
  async obterHistorico(req, res) {
    try {
      const colaborador = getColaborador(req);
      const { limite = 12 } = req.query;
      
      const historico = await comissaoService.obterHistoricoComissoes(
        colaborador.id, 
        parseInt(limite)
      );
      
      res.json({
        sucesso: true,
        historico
      });
    } catch (error) {
      console.error('Erro ao obter histórico:', error);
      res.status(500).json({
        sucesso: false,
        mensagem: error.message || 'Erro interno do servidor'
      });
    }
  }

  /**
   * Processar comissão mensal (apenas para teste/admin)
   */
  async processarComissaoMensal(req, res) {
    try {
      const colaborador = getColaborador(req);
      
      const resultado = await comissaoService.adicionarComissaoMensal(colaborador.id);
      
      res.json({
        sucesso: true,
        ...resultado
      });
    } catch (error) {
      console.error('Erro ao processar comissão mensal:', error);
      res.status(500).json({
        sucesso: false,
        mensagem: error.message || 'Erro interno do servidor'
      });
    }
  }

  /**
   * Processar comissões de todos os colaboradores (admin)
   */
  async processarTodasComissoes(req, res) {
    try {
      // TODO: Adicionar verificação de permissão de admin
      
      const resultado = await comissaoService.processarComissoesMensais();
      
      res.json({
        sucesso: true,
        ...resultado
      });
    } catch (error) {
      console.error('Erro ao processar todas as comissões:', error);
      res.status(500).json({
        sucesso: false,
        mensagem: error.message || 'Erro interno do servidor'
      });
    }
  }
}

export default new ComissaoController();