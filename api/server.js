// Importando as bibliotecas
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

// Inicializando o servidor Express
const app = express();

// Configurações básicas
app.use(cors()); // Permite requisições do seu frontend
app.use(express.json()); // Permite que a API entenda dados em JSON

// Configurando a conexão com o "Cofre" (MySQL)
// *Certifique-se de ter um banco chamado 'mais_gestao' criado no seu MySQL local
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',      // Seu usuário do MySQL
  password: 'root',      // Sua senha do MySQL
  database: 'mais_gestao'
});

// Testando a conexão
db.connect((err) => {
  if (err) {
    console.error('❌ Erro ao conectar no MySQL:', err);
    return;
  }
  console.log('✅ Conectado ao cofre MySQL com sucesso!');
});

// ---------------------------------------------------------
// ROTAS DA API
// ---------------------------------------------------------

// Rota Pública: Onde o site (instituto.html) vai buscar as notícias
app.get('/api/noticias', (req, res) => {
  const sql = "SELECT * FROM noticias ORDER BY data_criacao DESC";
  
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ erro: "Erro no banco de dados" });
    
    // Devolve as notícias no formato JSON para o seu Tailwind renderizar
    res.json(results);
  });
});

// Iniciando o servidor na porta 3000
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta http://localhost:${PORT}`);
});