import express from 'express';
import sqlite3 from 'sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const JWT_SECRET = 'delivery_secret_key_2024';


app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));


const db = new sqlite3.Database('../database.db');


db.serialize(() => {
    
    db.run(`
        CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            senha TEXT NOT NULL,
            tipo TEXT CHECK(tipo IN ('cliente', 'empresa', 'admin')) NOT NULL,
            nome TEXT NOT NULL,
            telefone TEXT,
            endereco TEXT,
            data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
            ativo BOOLEAN DEFAULT 1
        )
    `);

  
    db.run(`
        CREATE TABLE IF NOT EXISTS estabelecimentos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            empresa_id INTEGER NOT NULL,
            nome TEXT NOT NULL,
            descricao TEXT,
            categoria TEXT,
            endereco TEXT NOT NULL,
            telefone TEXT,
            cnpj TEXT UNIQUE,
            aprovado BOOLEAN DEFAULT 0,
            ativo BOOLEAN DEFAULT 1,
            data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (empresa_id) REFERENCES usuarios(id)
        )
    `);

 
    db.run(`
        CREATE TABLE IF NOT EXISTS produtos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            estabelecimento_id INTEGER NOT NULL,
            nome TEXT NOT NULL,
            descricao TEXT,
            preco DECIMAL(10,2) NOT NULL,
            categoria TEXT,
            disponivel BOOLEAN DEFAULT 1,
            FOREIGN KEY (estabelecimento_id) REFERENCES estabelecimentos(id)
        )
    `);

  
    db.run(`
        CREATE TABLE IF NOT EXISTS pedidos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cliente_id INTEGER NOT NULL,
            estabelecimento_id INTEGER NOT NULL,
            status TEXT CHECK(status IN ('pendente', 'confirmado', 'preparando', 'pronto', 'entregue', 'cancelado')) DEFAULT 'pendente',
            total DECIMAL(10,2) NOT NULL,
            endereco_entrega TEXT NOT NULL,
            observacao TEXT,
            data_pedido DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (cliente_id) REFERENCES usuarios(id),
            FOREIGN KEY (estabelecimento_id) REFERENCES estabelecimentos(id)
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS itens_pedido (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pedido_id INTEGER NOT NULL,
            produto_id INTEGER NOT NULL,
            quantidade INTEGER NOT NULL,
            preco_unitario DECIMAL(10,2) NOT NULL,
            FOREIGN KEY (pedido_id) REFERENCES pedidos(id),
            FOREIGN KEY (produto_id) REFERENCES produtos(id)
        )
    `);

   
    db.get("SELECT id FROM usuarios WHERE tipo = 'admin'", (err, row) => {
        if (!row) {
            const hashedPassword = bcrypt.hashSync('admin123', 10);
            db.run(
                "INSERT INTO usuarios (email, senha, tipo, nome) VALUES (?, ?, ?, ?)",
                ['admin@delivery.com', hashedPassword, 'admin', 'Administrador'],
                function(err) {
                    if (!err) {
                        console.log('✅ Admin padrão criado: admin@delivery.com / admin123');
                    }
                }
            );
        }
    });

    console.log('✅ Banco de dados inicializado');
});



function authMiddleware(allowedTypes = []) {
    return (req, res, next) => {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ error: 'Acesso negado. Token não fornecido.' });
        }

        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            req.user = decoded;
            
            if (allowedTypes.length > 0 && !allowedTypes.includes(decoded.tipo)) {
                return res.status(403).json({ error: 'Acesso negado. Permissão insuficiente.' });
            }
            
            next();
        } catch (error) {
            res.status(401).json({ error: 'Token inválido.' });
        }
    };
}


app.get('/api/test', (req, res) => {
    res.json({ message: 'API funcionando!' });
});


app.post('/api/auth/register', (req, res) => {
    const { email, senha, tipo, nome, telefone, endereco } = req.body;

    if (!['cliente', 'empresa'].includes(tipo)) {
        return res.status(400).json({ error: 'Tipo de usuário inválido' });
    }

    db.get("SELECT id FROM usuarios WHERE email = ?", [email], (err, row) => {
        if (err) return res.status(500).json({ error: 'Erro interno' });
        if (row) return res.status(400).json({ error: 'Email já cadastrado' });

        const hashedPassword = bcrypt.hashSync(senha, 10);

        db.run(
            "INSERT INTO usuarios (email, senha, tipo, nome, telefone, endereco) VALUES (?, ?, ?, ?, ?, ?)",
            [email, hashedPassword, tipo, nome, telefone, endereco],
            function(err) {
                if (err) return res.status(500).json({ error: 'Erro ao criar usuário' });
                
                res.status(201).json({ 
                    message: 'Usuário criado com sucesso',
                    userId: this.lastID 
                });
            }
        );
    });
});


app.post('/api/auth/login', (req, res) => {
    const { email, senha } = req.body;

    db.get(
        "SELECT id, email, senha, tipo, nome, ativo FROM usuarios WHERE email = ?",
        [email],
        (err, user) => {
            if (err) return res.status(500).json({ error: 'Erro interno' });
            if (!user || !bcrypt.compareSync(senha, user.senha)) {
                return res.status(400).json({ error: 'Credenciais inválidas' });
            }

            if (!user.ativo) {
                return res.status(400).json({ error: 'Usuário desativado' });
            }

            const token = jwt.sign(
                { 
                    id: user.id, 
                    email: user.email, 
                    tipo: user.tipo, 
                    nome: user.nome 
                },
                JWT_SECRET,
                { expiresIn: '24h' }
            );

            res.json({
                message: 'Login realizado com sucesso',
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    tipo: user.tipo,
                    nome: user.nome
                }
            });
        }
    );
});


app.get('/api/estabelecimentos', (req, res) => {
    db.all(
        `SELECT e.*, u.nome as empresa_nome 
         FROM estabelecimentos e
         JOIN usuarios u ON e.empresa_id = u.id
         WHERE e.aprovado = 1 AND e.ativo = 1`,
        (err, rows) => {
            if (err) {
                console.error('Erro ao buscar estabelecimentos:', err);
                return res.status(500).json({ error: 'Erro ao buscar estabelecimentos' });
            }
            res.json(rows);
        }
    );
});

app.get('/api/estabelecimentos/:id/produtos', (req, res) => {
    db.all(
        `SELECT * FROM produtos 
         WHERE estabelecimento_id = ? AND disponivel = 1 
         ORDER BY categoria, nome`,
        [req.params.id],
        (err, rows) => {
            if (err) {
                console.error('Erro ao buscar produtos:', err);
                return res.status(500).json({ error: 'Erro ao buscar produtos' });
            }
            res.json(rows);
        }
    );
});

app.post('/api/estabelecimentos', authMiddleware(['empresa']), (req, res) => {
    const { nome, descricao, categoria, endereco, telefone, cnpj } = req.body;

    if (!nome || !categoria || !endereco) {
        return res.status(400).json({ error: 'Nome, categoria e endereço são obrigatórios' });
    }

    db.run(
        `INSERT INTO estabelecimentos 
         (empresa_id, nome, descricao, categoria, endereco, telefone, cnpj) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [req.user.id, nome, descricao, categoria, endereco, telefone, cnpj],
        function(err) {
            if (err) {
                console.error('Erro no cadastro:', err);
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(400).json({ error: 'CNPJ já cadastrado' });
                }
                return res.status(500).json({ error: 'Erro ao cadastrar estabelecimento' });
            }
            
            res.status(201).json({ 
                message: 'Estabelecimento cadastrado com sucesso',
                estabelecimentoId: this.lastID 
            });
        }
    );
});


app.get('/api/estabelecimentos/meus', authMiddleware(['empresa']), (req, res) => {
    db.all(
        `SELECT * FROM estabelecimentos WHERE empresa_id = ? ORDER BY data_criacao DESC`,
        [req.user.id],
        (err, rows) => {
            if (err) {
                console.error('Erro ao buscar estabelecimentos:', err);
                return res.status(500).json({ error: 'Erro ao buscar estabelecimentos' });
            }
            res.json(rows);
        }
    );
});

app.post('/api/estabelecimentos/:id/produtos', authMiddleware(['empresa']), (req, res) => {
    const { nome, descricao, preco, categoria } = req.body;
    const estabelecimentoId = req.params.id;

    db.get(
        `SELECT id FROM estabelecimentos 
         WHERE id = ? AND empresa_id = ?`,
        [estabelecimentoId, req.user.id],
        (err, estabelecimento) => {
            if (err || !estabelecimento) {
                return res.status(403).json({ error: 'Acesso negado' });
            }

            if (!nome || !preco) {
                return res.status(400).json({ error: 'Nome e preço são obrigatórios' });
            }

            db.run(
                `INSERT INTO produtos 
                 (estabelecimento_id, nome, descricao, preco, categoria) 
                 VALUES (?, ?, ?, ?, ?)`,
                [estabelecimentoId, nome, descricao, preco, categoria],
                function(err) {
                    if (err) {
                        console.error('Erro ao adicionar produto:', err);
                        return res.status(500).json({ error: 'Erro ao adicionar produto' });
                    }
                    
                    res.status(201).json({ 
                        message: 'Produto adicionado com sucesso',
                        produtoId: this.lastID 
                    });
                }
            );
        }
    );
});

app.put('/api/produtos/:id', authMiddleware(['empresa']), (req, res) => {
    const { nome, descricao, preco, categoria, disponivel } = req.body;


    db.get(
        `SELECT p.id FROM produtos p
         JOIN estabelecimentos e ON p.estabelecimento_id = e.id
         WHERE p.id = ? AND e.empresa_id = ?`,
        [req.params.id, req.user.id],
        (err, produto) => {
            if (err || !produto) {
                return res.status(403).json({ error: 'Acesso negado' });
            }

            db.run(
                `UPDATE produtos 
                 SET nome = ?, descricao = ?, preco = ?, categoria = ?, disponivel = ?
                 WHERE id = ?`,
                [nome, descricao, preco, categoria, disponivel ? 1 : 0, req.params.id],
                function(err) {
                    if (err) {
                        console.error('Erro ao editar produto:', err);
                        return res.status(500).json({ error: 'Erro ao editar produto' });
                    }
                    
                    res.json({ message: 'Produto atualizado com sucesso' });
                }
            );
        }
    );
});

app.delete('/api/produtos/:id', authMiddleware(['empresa']), (req, res) => {
    db.get(
        `SELECT p.id FROM produtos p
         JOIN estabelecimentos e ON p.estabelecimento_id = e.id
         WHERE p.id = ? AND e.empresa_id = ?`,
        [req.params.id, req.user.id],
        (err, produto) => {
            if (err || !produto) {
                return res.status(403).json({ error: 'Acesso negado' });
            }

            db.run(
                `UPDATE produtos SET disponivel = 0 WHERE id = ?`,
                [req.params.id],
                function(err) {
                    if (err) {
                        console.error('Erro ao deletar produto:', err);
                        return res.status(500).json({ error: 'Erro ao deletar produto' });
                    }
                    
                    res.json({ message: 'Produto removido com sucesso' });
                }
            );
        }
    );
});

app.post('/api/pedidos', authMiddleware(['cliente']), (req, res) => {
    const { estabelecimento_id, itens, endereco_entrega, observacao } = req.body;

    if (!estabelecimento_id || !itens || !endereco_entrega) {
        return res.status(400).json({ error: 'Dados incompletos para o pedido' });
    }

    let total = 0;
    itens.forEach(item => {
        total += item.preco * item.quantidade;
    });

    db.serialize(() => {
        db.run(
            `INSERT INTO pedidos 
             (cliente_id, estabelecimento_id, total, endereco_entrega, observacao) 
             VALUES (?, ?, ?, ?, ?)`,
            [req.user.id, estabelecimento_id, total, endereco_entrega, observacao],
            function(err) {
                if (err) {
                    console.error('Erro ao criar pedido:', err);
                    return res.status(500).json({ error: 'Erro ao criar pedido' });
                }

                const pedidoId = this.lastID;
                const stmt = db.prepare(
                    `INSERT INTO itens_pedido 
                     (pedido_id, produto_id, quantidade, preco_unitario) 
                     VALUES (?, ?, ?, ?)`
                );

                itens.forEach(item => {
                    stmt.run([pedidoId, item.produtoId, item.quantidade, item.preco]);
                });

                stmt.finalize((err) => {
                    if (err) {
                        console.error('Erro ao inserir itens do pedido:', err);
                        return res.status(500).json({ error: 'Erro ao finalizar pedido' });
                    }

                    res.status(201).json({
                        message: 'Pedido realizado com sucesso!',
                        pedidoId: pedidoId,
                        total: total
                    });
                });
            }
        );
    });
});

app.get('/api/pedidos/meus', authMiddleware(['cliente']), (req, res) => {
    db.all(
        `SELECT p.*, e.nome as estabelecimento_nome 
         FROM pedidos p
         JOIN estabelecimentos e ON p.estabelecimento_id = e.id
         WHERE p.cliente_id = ?
         ORDER BY p.data_pedido DESC`,
        [req.user.id],
        (err, rows) => {
            if (err) {
                console.error('Erro ao buscar pedidos:', err);
                return res.status(500).json({ error: 'Erro ao buscar pedidos' });
            }
            res.json(rows);
        }
    );
});

app.get('/api/estabelecimentos/:id/pedidos', authMiddleware(['empresa']), (req, res) => {
    const estabelecimentoId = req.params.id;
    db.get(
        `SELECT id FROM estabelecimentos 
         WHERE id = ? AND empresa_id = ?`,
        [estabelecimentoId, req.user.id],
        (err, estabelecimento) => {
            if (err || !estabelecimento) {
                return res.status(403).json({ error: 'Acesso negado' });
            }

            db.all(
                `SELECT p.*, u.nome as cliente_nome, u.telefone as cliente_telefone
                 FROM pedidos p
                 JOIN usuarios u ON p.cliente_id = u.id
                 WHERE p.estabelecimento_id = ?
                 ORDER BY p.data_pedido DESC`,
                [estabelecimentoId],
                (err, rows) => {
                    if (err) {
                        console.error('Erro ao buscar pedidos:', err);
                        return res.status(500).json({ error: 'Erro ao buscar pedidos' });
                    }
                    res.json(rows);
                }
            );
        }
    );
});

app.get('/api/pedidos/:id', authMiddleware(['cliente', 'empresa']), (req, res) => {
    const pedidoId = req.params.id;

    db.get(
        `SELECT p.*, e.nome as estabelecimento_nome, u.nome as cliente_nome
         FROM pedidos p
         JOIN estabelecimentos e ON p.estabelecimento_id = e.id
         JOIN usuarios u ON p.cliente_id = u.id
         WHERE p.id = ?`,
        [pedidoId],
        (err, pedido) => {
            if (err || !pedido) {
                return res.status(404).json({ error: 'Pedido não encontrado' });
            }

            if (req.user.tipo === 'cliente' && pedido.cliente_id !== req.user.id) {
                return res.status(403).json({ error: 'Acesso negado' });
            }

            if (req.user.tipo === 'empresa') {
                db.get(
                    `SELECT id FROM estabelecimentos 
                     WHERE id = ? AND empresa_id = ?`,
                    [pedido.estabelecimento_id, req.user.id],
                    (err, estabelecimento) => {
                        if (err || !estabelecimento) {
                            return res.status(403).json({ error: 'Acesso negado' });
                        }
                        carregarItensPedido(pedido, res);
                    }
                );
            } else {
                carregarItensPedido(pedido, res);
            }
        }
    );

    function carregarItensPedido(pedido, res) {
        db.all(
            `SELECT ip.*, pr.nome as produto_nome
             FROM itens_pedido ip
             JOIN produtos pr ON ip.produto_id = pr.id
             WHERE ip.pedido_id = ?`,
            [pedidoId],
            (err, itens) => {
                if (err) {
                    console.error('Erro ao buscar itens do pedido:', err);
                    return res.status(500).json({ error: 'Erro ao buscar itens do pedido' });
                }

                res.json({
                    ...pedido,
                    itens: itens
                });
            }
        );
    }
});

app.put('/api/pedidos/:id/status', authMiddleware(['empresa']), (req, res) => {
    const { status } = req.body;
    const pedidoId = req.params.id;

    const statusValidos = ['pendente', 'confirmado', 'preparando', 'pronto', 'entregue', 'cancelado'];
    if (!statusValidos.includes(status)) {
        return res.status(400).json({ error: 'Status inválido' });
    }

    db.get(
        `SELECT p.id FROM pedidos p
         JOIN estabelecimentos e ON p.estabelecimento_id = e.id
         WHERE p.id = ? AND e.empresa_id = ?`,
        [pedidoId, req.user.id],
        (err, pedido) => {
            if (err || !pedido) {
                return res.status(403).json({ error: 'Acesso negado' });
            }

            db.run(
                `UPDATE pedidos SET status = ? WHERE id = ?`,
                [status, pedidoId],
                function(err) {
                    if (err) {
                        console.error('Erro ao atualizar status:', err);
                        return res.status(500).json({ error: 'Erro ao atualizar status' });
                    }

                    res.json({ 
                        message: 'Status atualizado com sucesso',
                        novoStatus: status
                    });
                }
            );
        }
    );
});

app.get('/api/admin/empresas-pendentes', authMiddleware(['admin']), (req, res) => {
    db.all(
        `SELECT e.*, u.nome as empresa_nome, u.email 
         FROM estabelecimentos e
         JOIN usuarios u ON e.empresa_id = u.id
         WHERE e.aprovado = 0 AND e.ativo = 1`,
        (err, rows) => {
            if (err) {
                console.error('Erro ao buscar empresas pendentes:', err);
                return res.status(500).json({ error: 'Erro ao buscar empresas pendentes' });
            }
            res.json(rows);
        }
    );
});

app.put('/api/admin/empresas/:id/aprovar', authMiddleware(['admin']), (req, res) => {
    db.run(
        "UPDATE estabelecimentos SET aprovado = 1 WHERE id = ?",
        [req.params.id],
        function(err) {
            if (err) {
                console.error('Erro ao aprovar empresa:', err);
                return res.status(500).json({ error: 'Erro ao aprovar empresa' });
            }
            res.json({ message: 'Empresa aprovada com sucesso' });
        }
    );
});

app.put('/api/admin/empresas/:id/rejeitar', authMiddleware(['admin']), (req, res) => {
    db.run(
        "UPDATE estabelecimentos SET ativo = 0 WHERE id = ?",
        [req.params.id],
        function(err) {
            if (err) {
                console.error('Erro ao rejeitar empresa:', err);
                return res.status(500).json({ error: 'Erro ao rejeitar empresa' });
            }
            res.json({ message: 'Empresa rejeitada com sucesso' });
        }
    );
});

app.get('/api/admin/usuarios', authMiddleware(['admin']), (req, res) => {
    db.all(
        "SELECT id, email, tipo, nome, telefone, ativo, data_criacao FROM usuarios WHERE tipo != 'admin'",
        (err, rows) => {
            if (err) {
                console.error('Erro ao buscar usuários:', err);
                return res.status(500).json({ error: 'Erro ao buscar usuários' });
            }
            res.json(rows);
        }
    );
});

app.put('/api/admin/usuarios/:id/toggle', authMiddleware(['admin']), (req, res) => {
    const { ativo } = req.body;
    
    db.run(
        "UPDATE usuarios SET ativo = ? WHERE id = ?",
        [ativo ? 1 : 0, req.params.id],
        function(err) {
            if (err) {
                console.error('Erro ao atualizar usuário:', err);
                return res.status(500).json({ error: 'Erro ao atualizar usuário' });
            }
            res.json({ message: `Usuário ${ativo ? 'ativado' : 'desativado'} com sucesso` });
        }
    );
});

function findAvailablePort(startPort = 3000, maxPort = 4000) {
    return new Promise((resolve, reject) => {
        function tryPort(port) {
            if (port > maxPort) {
                reject(new Error('Nenhuma porta disponível encontrada'));
                return;
            }

            const server = createServer();
            server.listen(port, () => {
                server.close(() => {
                    resolve(port);
                });
            });

            server.on('error', () => {
                tryPort(port + 1);
            });
        }

        tryPort(startPort);
    });
}

async function startServer() {
    try {
        const port = await findAvailablePort(3000, 4000);
        const server = app.listen(port, () => {
            console.log(`🚀 Servidor rodando na porta ${port}`);
            console.log(`📧 Admin: admin@delivery.com / admin123`);
            console.log(`🌐 Acesse: http://localhost:${port}`);
        });

       
        app.get('/api/port', (req, res) => {
            res.json({ port });
        });

    } catch (error) {
        console.error('❌ Erro ao iniciar servidor:', error.message);
    }
}

startServer();