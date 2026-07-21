// Importando as bibliotecas
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

// Inicializando o servidor Express
const app = express();

// Configurações básicas
app.use(cors()); // Permite requisições do seu frontend
app.use(express.json()); // Permite que a API entenda dados em JSON

let isDbConnected = false;

// Mock inicial para caso o MySQL não esteja rodando localmente
let mockNoticias = [
  { id: 1, titulo: "Inscrições abertas para a nova turma de Gestão 2026", conteudo: "Garanta sua vaga no programa de formação em liderança e gestão estratégica do instituto.", data_criacao: new Date().toISOString() },
  { id: 2, titulo: "Lançamento da Loja Oficial Mais Gestão", conteudo: "Agora você pode adquirir nossos materiais didáticos, apostilas e cursos diretamente pelo site!", data_criacao: new Date().toISOString() }
];

let mockProdutos = [
  { id: 1, nome: "Curso de Gestão Ágil e Projetos", descricao: "Aprenda metodologias ágeis (Scrum, Kanban) aplicadas à gestão estratégica.", preco: 299.90, categoria: "Cursos", imagem: "https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=600&q=80", estoque: 15 },
  { id: 2, nome: "Apostila de Indicadores & KPIs", descricao: "Guia prático para estruturação de metas e mensuração de resultados institucionais.", preco: 59.90, categoria: "Livros", imagem: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80", estoque: 30 },
  { id: 3, nome: "Kit Executivo Mais Gestão", descricao: "Caderno premium capa dura + caneta metálica personalizada + squeeze térmico.", preco: 89.90, categoria: "Acessórios", imagem: "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80", estoque: 25 },
  { id: 4, nome: "Workshop: Liderança & Comunicação", descricao: "Treinamento intensivo gravado com certificado de conclusão incluso.", preco: 149.00, categoria: "Cursos", imagem: "https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=600&q=80", estoque: 50 }
];

let mockPedidos = [];

// Configurando a conexão com o MySQL
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',      // Seu usuário do MySQL
  password: 'root',  // Sua senha do MySQL
  database: 'mais_gestao'
});

// Testando a conexão e criando tabelas necessárias
db.connect((err) => {
  if (err) {
    console.warn('⚠️ Não foi possível conectar no MySQL. Utilizando modo em memória temporário (Fallback).', err.message);
    isDbConnected = false;
    return;
  }
  isDbConnected = true;
  console.log('✅ Conectado ao cofre MySQL com sucesso!');

  // Inicializa tabelas se não existirem
  const sqlNoticias = `CREATE TABLE IF NOT EXISTS noticias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    conteudo TEXT NOT NULL,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`;

  const sqlProdutos = `CREATE TABLE IF NOT EXISTS produtos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT NOT NULL,
    preco DECIMAL(10,2) NOT NULL,
    categoria VARCHAR(100) NOT NULL,
    imagem VARCHAR(500),
    estoque INT DEFAULT 10,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`;

  const sqlPedidos = `CREATE TABLE IF NOT EXISTS pedidos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cliente_nome VARCHAR(255) NOT NULL,
    cliente_email VARCHAR(255) NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    forma_pagamento VARCHAR(50) NOT NULL,
    itens TEXT NOT NULL,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`;

  db.query(sqlNoticias, (err) => {
    if (err) console.error("Erro ao criar tabela noticias:", err);
  });

  db.query(sqlProdutos, (err) => {
    if (err) {
      console.error("Erro ao criar tabela produtos:", err);
    } else {
      // Seed inicial se estiver vazia
      db.query("SELECT COUNT(*) as qtd FROM produtos", (e, res) => {
        if (!e && res[0].qtd === 0) {
          mockProdutos.forEach(p => {
            db.query("INSERT INTO produtos (nome, descricao, preco, categoria, imagem, estoque) VALUES (?, ?, ?, ?, ?, ?)",
              [p.nome, p.descricao, p.preco, p.categoria, p.imagem, p.estoque]
            );
          });
        }
      });
    }
  });

  db.query(sqlPedidos, (err) => {
    if (err) console.error("Erro ao criar tabela pedidos:", err);
  });
});

// Token simples de autenticação administrativa
const ADMIN_TOKEN = "token-maisgestao-admin-secret";
const ADMIN_USER = "admin";
const ADMIN_PASS = "admin123";

// Middleware para verificar autorização
function verificarAutenticacao(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${ADMIN_TOKEN}`) {
    return res.status(401).json({ erro: "Acesso não autorizado! Faça login no painel para realizar esta ação." });
  }
  next();
}

// ---------------------------------------------------------
// ROTA DE AUTENTICAÇÃO / LOGIN
// ---------------------------------------------------------
app.post('/api/login', (req, res) => {
  const { usuario, senha } = req.body;
  if (usuario === ADMIN_USER && senha === ADMIN_PASS) {
    return res.json({
      sucesso: true,
      token: ADMIN_TOKEN,
      usuario: ADMIN_USER,
      mensagem: "Login efetuado com sucesso!"
    });
  }
  return res.status(401).json({ erro: "Usuário ou senha incorretos!" });
});

// ---------------------------------------------------------
// ROTAS DE NOTÍCIAS
// ---------------------------------------------------------

app.get('/api/noticias', (req, res) => {
  if (!isDbConnected) {
    return res.json(mockNoticias);
  }
  const sql = "SELECT * FROM noticias ORDER BY data_criacao DESC";
  db.query(sql, (err, results) => {
    if (err) return res.json(mockNoticias); // fallback em caso de erro na consulta
    res.json(results);
  });
});

app.post('/api/noticias', verificarAutenticacao, (req, res) => {
  const { titulo, conteudo } = req.body;
  if (!titulo || !conteudo) {
    return res.status(400).json({ erro: "Título e conteúdo são obrigatórios!" });
  }

  if (!isDbConnected) {
    const novaNoticia = { id: Date.now(), titulo, conteudo, data_criacao: new Date().toISOString() };
    mockNoticias.unshift(novaNoticia);
    return res.status(201).json({ mensagem: "Notícia publicada com sucesso! (Modo Em Memória)" });
  }

  const sql = "INSERT INTO noticias (titulo, conteudo) VALUES (?, ?)";
  db.query(sql, [titulo, conteudo], (err, result) => {
    if (err) return res.status(500).json({ erro: "Erro ao salvar no banco" });
    res.status(201).json({ mensagem: "Notícia publicada com sucesso!" });
  });
});

// ---------------------------------------------------------
// ROTAS DO E-COMMERCE (PRODUTOS & PEDIDOS)
// ---------------------------------------------------------

// Listar produtos
app.get('/api/produtos', (req, res) => {
  if (!isDbConnected) {
    return res.json(mockProdutos);
  }
  const sql = "SELECT * FROM produtos ORDER BY id DESC";
  db.query(sql, (err, results) => {
    if (err) return res.json(mockProdutos);
    res.json(results);
  });
});

// Criar novo produto
app.post('/api/produtos', verificarAutenticacao, (req, res) => {
  const { nome, descricao, preco, categoria, imagem, estoque } = req.body;

  if (!nome || !descricao || !preco || !categoria) {
    return res.status(400).json({ erro: "Nome, descrição, preço e categoria são obrigatórios!" });
  }

  const numPreco = parseFloat(preco);
  const numEstoque = parseInt(estoque) || 10;
  const imgUrl = imagem || "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=600&q=80";

  if (!isDbConnected) {
    const novoProduto = {
      id: Date.now(),
      nome,
      descricao,
      preco: numPreco,
      categoria,
      imagem: imgUrl,
      estoque: numEstoque
    };
    mockProdutos.unshift(novoProduto);
    return res.status(201).json({ mensagem: "Produto cadastrado com sucesso! (Modo Em Memória)" });
  }

  const sql = "INSERT INTO produtos (nome, descricao, preco, categoria, imagem, estoque) VALUES (?, ?, ?, ?, ?, ?)";
  db.query(sql, [nome, descricao, numPreco, categoria, imgUrl, numEstoque], (err, result) => {
    if (err) return res.status(500).json({ erro: "Erro ao cadastrar produto no banco" });
    res.status(201).json({ mensagem: "Produto cadastrado com sucesso!" });
  });
});

// Deletar produto
app.delete('/api/produtos/:id', verificarAutenticacao, (req, res) => {
  const { id } = req.params;

  if (!isDbConnected) {
    mockProdutos = mockProdutos.filter(p => p.id != id);
    return res.json({ mensagem: "Produto removido com sucesso!" });
  }

  const sql = "DELETE FROM produtos WHERE id = ?";
  db.query(sql, [id], (err, result) => {
    if (err) return res.status(500).json({ erro: "Erro ao deletar produto do banco" });
    res.json({ mensagem: "Produto removido com sucesso!" });
  });
});

// Finalizar pedido
app.post('/api/pedidos', (req, res) => {
  const { cliente_nome, cliente_email, total, forma_pagamento, itens } = req.body;

  if (!cliente_nome || !cliente_email || !total || !itens) {
    return res.status(400).json({ erro: "Dados do pedido incompletos!" });
  }

  const stringItens = typeof itens === 'object' ? JSON.stringify(itens) : itens;

  if (!isDbConnected) {
    const novoPedido = {
      id: Date.now(),
      cliente_nome,
      cliente_email,
      total,
      forma_pagamento: forma_pagamento || 'PIX',
      itens: stringItens,
      data_criacao: new Date().toISOString()
    };
    mockPedidos.push(novoPedido);
    return res.status(201).json({ mensagem: "Pedido registrado com sucesso!", pedidoId: novoPedido.id });
  }

  const sql = "INSERT INTO pedidos (cliente_nome, cliente_email, total, forma_pagamento, itens) VALUES (?, ?, ?, ?, ?)";
  db.query(sql, [cliente_nome, cliente_email, total, forma_pagamento || 'PIX', stringItens], (err, result) => {
    if (err) return res.status(500).json({ erro: "Erro ao salvar pedido no banco" });
    res.status(201).json({ mensagem: "Pedido registrado com sucesso!", pedidoId: result.insertId });
  });
});

// Iniciando o servidor na porta 3000
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta http://localhost:${PORT}`);
});