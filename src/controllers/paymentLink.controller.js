import prisma from '../services/prisma.service.js';

// Criar um novo link de pagamento
export const criar = async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL é obrigatória' });
  }

  try {
    const novoLink = await prisma.paymentLink.create({
      data: {
        url,
      },
    });
    res.status(201).json({ message: 'Link de pagamento criado com sucesso', link: novoLink });
  } catch (err) {
    console.error('Erro ao criar link de pagamento:', err);
    if (err.code === 'P2002') {
      return res.status(400).json({ error: 'Este link já existe' });
    }
    res.status(500).json({ error: 'Erro ao criar link de pagamento' });
  }
};

// Listar todos os links de pagamento
export const listar = async (req, res) => {
  try {
    const links = await prisma.paymentLink.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json(links);
  } catch (err) {
    console.error('Erro ao listar links de pagamento:', err);
    res.status(500).json({ error: 'Erro ao buscar links de pagamento' });
  }
};

// Listar apenas links disponíveis (não usados)
export const listarDisponiveis = async (req, res) => {
  try {
    const linksDisponiveis = await prisma.paymentLink.findMany({
      where: { isUsed: false },
      orderBy: { createdAt: 'desc' },
    });
    res.json(linksDisponiveis);
  } catch (err) {
    console.error('Erro ao listar links disponíveis:', err);
    res.status(500).json({ error: 'Erro ao buscar links disponíveis' });
  }
};

// Obter um link aleatório disponível
export const obterLinkAleatorio = async (req, res) => {
  try {
    const linksDisponiveis = await prisma.paymentLink.findMany({
      where: { isUsed: false },
    });

    if (linksDisponiveis.length === 0) {
      return res.status(404).json({ error: 'Nenhum link de pagamento disponível' });
    }

    // Seleciona um link aleatório
    const linkAleatorio = linksDisponiveis[Math.floor(Math.random() * linksDisponiveis.length)];
    
    res.json(linkAleatorio);
  } catch (err) {
    console.error('Erro ao obter link aleatório:', err);
    res.status(500).json({ error: 'Erro ao obter link de pagamento' });
  }
};

// Marcar um link como usado
export const marcarComoUsado = async (req, res) => {
  const { id } = req.params;

  try {
    const link = await prisma.paymentLink.findUnique({
      where: { id },
    });

    if (!link) {
      return res.status(404).json({ error: 'Link não encontrado' });
    }

    if (link.isUsed) {
      return res.status(400).json({ error: 'Link já foi usado' });
    }

    const linkAtualizado = await prisma.paymentLink.update({
      where: { id },
      data: {
        isUsed: true,
        usedAt: new Date(),
      },
    });

    res.json({ message: 'Link marcado como usado', link: linkAtualizado });
  } catch (err) {
    console.error('Erro ao marcar link como usado:', err);
    res.status(500).json({ error: 'Erro ao atualizar link' });
  }
};

// Resetar um link (marcar como não usado)
export const resetarLink = async (req, res) => {
  const { id } = req.params;

  try {
    const linkAtualizado = await prisma.paymentLink.update({
      where: { id },
      data: {
        isUsed: false,
        usedAt: null,
      },
    });

    res.json({ message: 'Link resetado com sucesso', link: linkAtualizado });
  } catch (err) {
    console.error('Erro ao resetar link:', err);
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Link não encontrado' });
    }
    res.status(500).json({ error: 'Erro ao resetar link' });
  }
};

// Deletar um link
export const deletar = async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.paymentLink.delete({
      where: { id },
    });

    res.json({ message: 'Link deletado com sucesso' });
  } catch (err) {
    console.error('Erro ao deletar link:', err);
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Link não encontrado' });
    }
    res.status(500).json({ error: 'Erro ao deletar link' });
  }
};

// Criar múltiplos links de uma vez
export const criarMultiplos = async (req, res) => {
  const { urls } = req.body;

  if (!urls || !Array.isArray(urls) || urls.length === 0) {
    return res.status(400).json({ error: 'Array de URLs é obrigatório' });
  }

  try {
    const linksData = urls.map(url => ({ url }));
    
    const novosLinks = await prisma.paymentLink.createMany({
      data: linksData,
      skipDuplicates: true, // Pula URLs duplicadas
    });

    res.status(201).json({ 
      message: `${novosLinks.count} links de pagamento criados com sucesso`,
      count: novosLinks.count 
    });
  } catch (err) {
    console.error('Erro ao criar múltiplos links:', err);
    res.status(500).json({ error: 'Erro ao criar links de pagamento' });
  }
};