import prisma from '../services/prisma.service.js';
import bcrypt from 'bcrypt';
import auditService from '../services/audit.service.js';

const funcionariosController = {
  // Listar todos os funcionários
  // Listar funcionários do usuário PRINCIPAL
  listar: async (req, res) => {
    try {
      const usuarioPrincipal = req.user;
      
      // Verificar se é usuário PRINCIPAL
      if (usuarioPrincipal.tipo !== 'PRINCIPAL') {
        return res.status(403).json({
          status: 403,
          message: 'Apenas usuários PRINCIPAL podem listar funcionários'
        });
      }
  
      const funcionarios = await prisma.funcionario.findMany({
        where: {
          usuarioId: usuarioPrincipal.id // Funcionários deste usuário PRINCIPAL
        },
        select: {
          id: true,
          nome: true,
          email: true,
          permissoes: true,
          ativo: true,
          criadoEm: true
        },
        orderBy: {
          criadoEm: 'desc'
        }
      });
  
      res.json({
        status: 200,
        message: 'Funcionários listados com sucesso',
        funcionarios
      });
    } catch (error) {
      console.error('Erro ao listar funcionários:', error);
      res.status(500).json({
        status: 500,
        message: 'Erro interno do servidor'
      });
    }
  },

  // Criar novo funcionário
  criar: async (req, res) => {
    try {
      const { nome, email, senha, permissoes } = req.body;
      
      // Log para debug
      console.log('Dados recebidos no backend:', { nome, email, permissoes });
      
      // Obter dados do usuário PRINCIPAL logado
      const usuarioPrincipal = req.user;
      
      // Verificar se é usuário PRINCIPAL
      if (usuarioPrincipal.tipo !== 'PRINCIPAL') {
        return res.status(403).json({
          status: 403,
          message: 'Apenas usuários PRINCIPAL podem criar funcionários'
        });
      }

      // Verificar limite de funcionários baseado no plano
      const funcionariosExistentes = await prisma.funcionario.count({
        where: {
          usuarioId: usuarioPrincipal.id,
          ativo: true
        }
      });

      const planoAtual = (usuarioPrincipal.assinatura || '').toLowerCase();
      const planosComLimiteCinco = ['premium', 'teste', 'versao', 'versão'];
      const limiteMaximo = planosComLimiteCinco.includes(planoAtual) ? 5 : 2;

      if (funcionariosExistentes >= limiteMaximo) {
        return res.status(400).json({
          status: 400,
          message: `Limite máximo de ${limiteMaximo} funcionários atingido`
        });
      }
  
      // Validações básicas
      if (!nome || !email || !senha) {
        return res.status(400).json({
          status: 400,
          message: 'Nome, email e senha são obrigatórios'
        });
      }

      // Validar permissões - deve ter pelo menos uma
      if (!permissoes || permissoes.length === 0) {
        return res.status(400).json({
          status: 400,
          message: 'Selecione pelo menos uma página de acesso para o funcionário'
        });
      }

      const permissoesValidas = ['vendas', 'produtos', 'relatorios', 'despesas', 'dashboard', 'rh', 'assinatura'];
      const permissoesInvalidas = permissoes.filter(p => !permissoesValidas.includes(p));
      
      if (permissoesInvalidas.length > 0) {
        return res.status(400).json({
          status: 400,
          message: `Permissões inválidas: ${permissoesInvalidas.join(', ')}`
        });
      }
  
      // Verificar se email já existe na tabela de funcionários
      const emailExiste = await prisma.funcionario.findUnique({
        where: { email }
      });
  
      if (emailExiste) {
        return res.status(409).json({
          status: 409,
          message: 'Email já está em uso'
        });
      }
  
      // Hash da senha
      const senhaHash = await bcrypt.hash(senha, 10);
  
      // Log das permissões antes de salvar
      console.log('Permissões que serão salvas:', permissoes);
      
      // Criar funcionário
      const funcionario = await prisma.funcionario.create({
        data: {
          nome,
          email,
          senha: senhaHash,
          permissoes: permissoes,
          usuarioId: usuarioPrincipal.id,
          ativo: true
        },
        select: {
          id: true,
          nome: true,
          email: true,
          permissoes: true,
          ativo: true,
          criadoEm: true
        }
      });
      
      // Log do funcionário criado
      console.log('Funcionário criado:', funcionario);

      await auditService.registrar(req, {
        acao: 'CRIAR_FUNCIONARIO',
        categoria: 'FUNCIONARIOS',
        entidade: 'Funcionario',
        entidadeId: funcionario.id,
        descricao: `Funcionário criado: ${funcionario.nome}`,
        metadata: { email: funcionario.email, permissoes: funcionario.permissoes }
      });
  
      res.status(201).json({
        status: 201,
        message: 'Funcionário criado com sucesso',
        funcionario
      });
    } catch (error) {
      console.error('Erro ao criar funcionário:', error);
      res.status(500).json({
        status: 500,
        message: 'Erro interno do servidor'
      });
    }
  },

  // Buscar funcionário por ID
  buscarPorId: async (req, res) => {
    try {
      const { id } = req.params;

      const funcionario = await prisma.funcionario.findFirst({
        where: {
          id,
          usuarioId: req.user.id // Apenas funcionários do usuário logado
        },
        select: {
          id: true,
          nome: true,
          email: true,
          permissoes: true,
          ativo: true,
          criadoEm: true
        }
      });

      if (!funcionario) {
        return res.status(404).json({
          status: 404,
          message: 'Funcionário não encontrado'
        });
      }

      res.json({
        status: 200,
        message: 'Funcionário encontrado',
        funcionario
      });
    } catch (error) {
      console.error('Erro ao buscar funcionário:', error);
      res.status(500).json({
        status: 500,
        message: 'Erro interno do servidor'
      });
    }
  },

  // Atualizar funcionário
  atualizar: async (req, res) => {
    try {
      const { id } = req.params;
      const { nome, email, permissoes } = req.body;

      // Verificar se funcionário existe
      const funcionarioExiste = await prisma.funcionario.findFirst({
        where: {
          id,
          usuarioId: req.user.id // Apenas funcionários do usuário logado
        }
      });

      if (!funcionarioExiste) {
        return res.status(404).json({
          status: 404,
          message: 'Funcionário não encontrado'
        });
      }

      // Se email foi alterado, verificar se não está em uso
      if (email && email !== funcionarioExiste.email) {
        const emailEmUso = await prisma.funcionario.findUnique({
          where: { email }
        });

        if (emailEmUso) {
          return res.status(409).json({
            status: 409,
            message: 'Email já está em uso'
          });
        }
      }

      // Validar permissões se fornecidas
      if (permissoes) {
        const permissoesValidas = ['vendas', 'produtos', 'relatorios', 'despesas', 'dashboard', 'rh', 'assinatura'];
        const permissoesInvalidas = permissoes.filter(p => !permissoesValidas.includes(p));
        
        if (permissoesInvalidas.length > 0) {
          return res.status(400).json({
            status: 400,
            message: `Permissões inválidas: ${permissoesInvalidas.join(', ')}`
          });
        }
      }

      // Atualizar funcionário
      const funcionarioAtualizado = await prisma.funcionario.update({
        where: { id },
        data: {
          ...(nome && { nome }),
          ...(email && { email }),
          ...(permissoes && { permissoes })
        },
        select: {
          id: true,
          nome: true,
          email: true,
          permissoes: true,
          ativo: true,
          criadoEm: true
        }
      });

      res.json({
        status: 200,
        message: 'Funcionário atualizado com sucesso',
        funcionario: funcionarioAtualizado
      });

      await auditService.registrar(req, {
        acao: 'ATUALIZAR_FUNCIONARIO',
        categoria: 'FUNCIONARIOS',
        entidade: 'Funcionario',
        entidadeId: funcionarioAtualizado.id,
        descricao: `Funcionário atualizado: ${funcionarioAtualizado.nome}`,
        metadata: { email: funcionarioAtualizado.email, permissoes: funcionarioAtualizado.permissoes }
      });
    } catch (error) {
      console.error('Erro ao atualizar funcionário:', error);
      res.status(500).json({
        status: 500,
        message: 'Erro interno do servidor'
      });
    }
  },

  // Deletar funcionário
  deletar: async (req, res) => {
    try {
      const { id } = req.params;

      // Verificar se funcionário existe
      const funcionario = await prisma.funcionario.findFirst({
        where: {
          id,
          usuarioId: req.user.id // Apenas funcionários do usuário logado
        }
      });

      if (!funcionario) {
        return res.status(404).json({
          status: 404,
          message: 'Funcionário não encontrado'
        });
      }

      // Deletar funcionário
      await prisma.funcionario.delete({
        where: { id }
      });

      res.json({
        status: 200,
        message: 'Funcionário deletado com sucesso'
      });

      await auditService.registrar(req, {
        acao: 'DELETAR_FUNCIONARIO',
        categoria: 'FUNCIONARIOS',
        entidade: 'Funcionario',
        entidadeId: id,
        descricao: `Funcionário deletado: ${funcionario.nome}`,
        metadata: { email: funcionario.email }
      });
    } catch (error) {
      console.error('Erro ao deletar funcionário:', error);
      res.status(500).json({
        status: 500,
        message: 'Erro interno do servidor'
      });
    }
  }
};

export default funcionariosController;