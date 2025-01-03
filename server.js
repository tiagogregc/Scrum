const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const app = express();
const port = 3000;

app.use(express.json());
app.use(cors());

// Configuração do banco de dados MySQL
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '123456',
    database: 'scrum_db'
});

// Conectar ao banco de dados
db.connect((err) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err);
        return;
    }
    console.log('Conectado ao banco de dados MySQL');
});

// Rota para obter o próximo ID de matrícula
app.get('/next-matricula', (req, res) => {
    const sql = 'SELECT COALESCE(MAX(matricula), 0) + 1 AS nextMatricula FROM pessoas';
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Erro ao buscar próximo ID:', err);
            return res.status(500).json({ message: 'Erro ao buscar próximo ID' });
        }
        res.json({ nextMatricula: results[0].nextMatricula });
    });
});

// Rota para obter o próximo ID de projeto
app.get('/next-project-id', (req, res) => {
    const sql = 'SELECT COALESCE(MAX(id), 0) + 1 AS nextProjectId FROM projetos';
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Erro ao buscar próximo ID de projeto:', err);
            return res.status(500).json({ message: 'Erro ao buscar próximo ID de projeto' });
        }
        res.json({ nextProjectId: results[0].nextProjectId });
    });
});

// CRUD para pessoas
app.post('/person', (req, res) => {
    const { matricula, nome, cargo } = req.body;
    const sql = 'INSERT INTO pessoas (matricula, nome, cargo) VALUES (?, ?, ?)';
    db.query(sql, [matricula, nome, cargo], (err, result) => {
        if (err) {
            console.error('Erro ao criar pessoa:', err);
            return res.status(500).json({ message: 'Erro ao criar pessoa' });
        }
        res.status(201).json({ id: result.insertId });
    });
});

app.get('/persons', (req, res) => {
    const sql = 'SELECT matricula, nome, cargo FROM pessoas';
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Erro ao buscar pessoas:', err);
            return res.status(500).json({ message: 'Erro ao buscar pessoas' });
        }
        res.status(200).json(results);
    });
});

app.get('/persons/:matricula', (req, res) => {
    const { matricula } = req.params;
    const sql = 'SELECT * FROM pessoas WHERE matricula = ?';
    db.query(sql, [matricula], (err, results) => {
        if (err) {
            console.error('Erro ao buscar pessoa:', err);
            return res.status(500).json({ message: 'Erro ao buscar pessoa' });
        }
        if (results.length > 0) {
            res.status(200).json(results[0]);
        } else {
            res.status(404).json({ message: 'Pessoa não encontrada' });
        }
    });
});

app.put('/persons/:matricula', (req, res) => {
    const { matricula } = req.params;
    const { nome, cargo } = req.body;
    const sql = 'UPDATE pessoas SET nome = ?, cargo = ? WHERE matricula = ?';
    db.query(sql, [nome, cargo, matricula], (err, result) => {
        if (err) {
            console.error('Erro ao atualizar pessoa:', err);
            return res.status(500).json({ message: 'Erro ao atualizar pessoa' });
        }
        if (result.affectedRows > 0) {
            res.status(200).json({ message: 'Pessoa atualizada com sucesso' });
        } else {
            res.status(404).json({ message: 'Pessoa não encontrada' });
        }
    });
});

// Rota para excluir uma pessoa
app.delete('/persons/:matricula', (req, res) => {
    const matricula = req.params.matricula;

    console.log(`Iniciando a exclusão da pessoa com matrícula: ${matricula}`);

    // 1. Verificar se a pessoa é product owner ou scrum master em projetos
    const checkAssociationsQuery = `
        SELECT COUNT(*) AS count 
        FROM projetos 
        WHERE product_owner = ? OR scrum_master = ? OR id IN (
            SELECT projeto_id 
            FROM equipe_projeto 
            WHERE pessoa_id = ?
        )
    `;

    db.query(checkAssociationsQuery, [matricula, matricula, matricula], (err, results) => {
        if (err) {
            console.error('Erro ao verificar associações de projeto:', err);
            return res.status(500).json({ message: 'Erro ao verificar associações de projeto' });
        }

        if (results[0].count > 0) {
            return res.status(400).json({ message: 'Exclusão não permitida: Pessoa cadastrada em projeto.' });
        }

        // 2. Excluir pessoa
        db.query('DELETE FROM pessoas WHERE matricula = ?', [matricula], (err, result) => {
            if (err) {
                console.error('Erro ao excluir pessoa:', err);
                return res.status(500).json({ message: 'Erro ao excluir pessoa' });
            }

            if (result.affectedRows === 0) {
                console.error('Pessoa não encontrada.');
                return res.status(404).json({ message: 'Pessoa não encontrada' });
            }

            console.log('Pessoa excluída com sucesso.');
            res.json({ message: 'Pessoa excluída com sucesso!' });
        });
    });
});

// Rota para verificar se o projeto existe
app.get('/projects/check-existence/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const [results] = await db.promise().execute(
            'SELECT COUNT(*) AS count FROM projetos WHERE id = ?',
            [id]
        );

        const exists = results[0].count > 0;
        res.json({ exists });
    } catch (error) {
        console.error('Erro ao verificar existência do projeto:', error);
        res.status(500).json({ message: 'Erro ao verificar existência do projeto' });
    }
});

// Rota para obter o próximo ID esperado para exibição (sem usá-lo na criação)
app.get('/next-project-id', async (req, res) => {
    try {
        const [result] = await db.promise().query('SELECT AUTO_INCREMENT as nextProjectId FROM information_schema.tables WHERE table_name = "projetos"');
        const nextProjectId = result[0].nextProjectId;
        res.json({ nextProjectId });
    } catch (error) {
        console.error('Erro ao obter o próximo ID do projeto:', error);
        res.status(500).json({ message: 'Erro ao obter próximo ID do projeto' });
    }
});

// Rota para criar projetos
app.post('/projects', async (req, res) => {
    const { nome, product_owner_matricula, scrum_master_matricula, team_members } = req.body;

    console.log('Dados recebidos:', { nome, product_owner_matricula, scrum_master_matricula, team_members });

    try {
        // Inserir o projeto na tabela 'projetos'
        const [result] = await db.promise().execute(
            'INSERT INTO projetos (nome, product_owner, scrum_master) VALUES (?, ?, ?)',
            [nome, product_owner_matricula, scrum_master_matricula]
        );

        // Obtenha o ID do projeto gerado automaticamente após a inserção
        const projectId = result.insertId;
        console.log('Projeto criado com ID:', projectId);

        if (!projectId) {
            throw new Error('Erro ao criar projeto: ID não retornado');
        }

        // Verificar se team_members é um array antes de tentar iterar
        if (Array.isArray(team_members) && team_members.length > 0) {
            const teamInsertPromises = team_members.map(pessoa_id => {
                return db.promise().execute(
                    'INSERT INTO equipe_projeto (projeto_id, pessoa_id) VALUES (?, ?)',
                    [projectId, pessoa_id]
                );
            });

            // Aguardar a conclusão de todas as inserções
            const results = await Promise.allSettled(teamInsertPromises);

            const failedInserts = results.filter(result => result.status === 'rejected');
            if (failedInserts.length > 0) {
                console.error('Algumas inserções de equipe falharam:', failedInserts);
                return res.status(500).json({
                    error: 'Erro ao criar o projeto',
                    details: 'Falha na inserção da equipe',
                    failedInserts // Adicionando detalhes sobre falhas nas inserções
                });
            }
        } else {
            console.log('Nenhuma equipe para inserir.');
        }

        res.status(201).json({ message: 'Projeto criado com sucesso', projectId });
    } catch (error) {
        console.error('Erro ao criar o projeto:', error);
        res.status(500).json({
            error: 'Erro ao criar o projeto',
            details: error.message,
            stack: error.stack // Adicionando detalhes da pilha de erros para análise mais detalhada
        });
    }
});

    // Rota para listar projetos
    app.get('/projects', (req, res) => {
        const query = `
            SELECT p.id, p.nome, 
                po.nome AS product_owner_nome, 
                sm.nome AS scrum_master_nome,
                GROUP_CONCAT(e.nome SEPARATOR ', ') AS equipe
            FROM projetos p
            LEFT JOIN pessoas po ON p.product_owner = po.matricula
            LEFT JOIN pessoas sm ON p.scrum_master = sm.matricula
            LEFT JOIN equipe_projeto ep ON p.id = ep.projeto_id
            LEFT JOIN pessoas e ON ep.pessoa_id = e.matricula
            GROUP BY p.id, p.nome, po.nome, sm.nome
        `;
    
        db.query(query, (err, results) => {
            if (err) {
                console.error('Erro ao buscar projetos:', err);
                return res.status(500).json({ message: 'Erro ao buscar projetos' });
            }
    
            res.json(results);
        });
    });
    
    // Rota para obter todos os membros e os membros associados a um projeto específico
    app.get('/project/:id/team-members', (req, res) => {
        const { id } = req.params;
    
        // Obter todos os membros da equipe
        const allMembersQuery = 'SELECT matricula, nome FROM pessoas';
    
        // Obter membros associados ao projeto
        const projectMembersQuery = `
            SELECT p.matricula, p.nome 
            FROM pessoas p
            JOIN equipe_projeto ep ON p.matricula = ep.pessoa_id
            WHERE ep.projeto_id = ?
        `;
    
        db.query(allMembersQuery, (err, allMembers) => {
            if (err) {
                console.error('Erro ao buscar todos os membros:', err);
                return res.status(500).json({ message: 'Erro ao buscar todos os membros' });
            }
    
            db.query(projectMembersQuery, [id], (err, projectMembers) => {
                if (err) {
                    console.error('Erro ao buscar membros do projeto:', err);
                    return res.status(500).json({ message: 'Erro ao buscar membros do projeto' });
                }
    
                const projectMemberIds = projectMembers.map(member => member.matricula);
                const response = allMembers.map(member => ({
                    ...member,
                    selected: projectMemberIds.includes(member.matricula)
                }));
    
                res.json(response);
            });
        });
    });
    
    // Rota para obter detalhes de um projeto específico
    app.get('/projects/:id', (req, res) => {
        const { id } = req.params;
    
        const query = `
            SELECT p.id, p.nome, 
                p.product_owner AS product_owner_matricula, 
                po.nome AS product_owner_nome,
                p.scrum_master AS scrum_master_matricula,
                sm.nome AS scrum_master_nome,
                GROUP_CONCAT(e.nome SEPARATOR ', ') AS equipe
            FROM projetos p
            LEFT JOIN pessoas po ON p.product_owner = po.matricula
            LEFT JOIN pessoas sm ON p.scrum_master = sm.matricula
            LEFT JOIN equipe_projeto ep ON p.id = ep.projeto_id
            LEFT JOIN pessoas e ON ep.pessoa_id = e.matricula
            WHERE p.id = ?
            GROUP BY p.id, p.nome, p.product_owner, po.nome, p.scrum_master, sm.nome
        `;
    
        db.query(query, [id], (err, results) => {
            if (err) {
                console.error('Erro ao buscar projeto:', err);
                return res.status(500).json({ message: 'Erro ao buscar projeto' });
            }
    
            if (results.length > 0) {
                res.json(results[0]);
            } else {
                res.status(404).json({ message: 'Projeto não encontrado' });
            }
        });
    });
    
    // Rota para atualizar um projeto
    app.put('/projects/:id', (req, res) => {
        const { id } = req.params;
        const { nome, product_owner_matricula, scrum_master_matricula, team_members } = req.body;
    
        // Atualizar o projeto
        const sqlProject = 'UPDATE projetos SET nome = ?, product_owner = ?, scrum_master = ? WHERE id = ?';
        db.query(sqlProject, [nome, product_owner_matricula, scrum_master_matricula, id], (err) => {
            if (err) {
                console.error('Erro ao atualizar projeto:', err);
                return res.status(500).json({ message: 'Erro ao atualizar projeto' });
            }
    
            // Atualizar equipe
            const deleteTeamQuery = 'DELETE FROM equipe_projeto WHERE projeto_id = ?';
            db.query(deleteTeamQuery, [id], (err) => {
                if (err) {
                    console.error('Erro ao remover equipe do projeto:', err);
                    return res.status(500).json({ message: 'Erro ao remover equipe do projeto' });
                }
    
                if (team_members && team_members.length > 0) {
                    const insertTeamQuery = 'INSERT INTO equipe_projeto (projeto_id, pessoa_id) VALUES ?';
                    const teamValues = team_members.map(pessoaId => [id, pessoaId]);
    
                    db.query(insertTeamQuery, [teamValues], (err) => {
                        if (err) {
                            console.error('Erro ao adicionar equipe ao projeto:', err);
                            return res.status(500).json({ message: 'Erro ao adicionar equipe ao projeto' });
                        }
    
                        res.json({ message: 'Projeto atualizado com sucesso' });
                    });
                } else {
                    res.json({ message: 'Projeto atualizado com sucesso' });
                }
            });
        });
    });
    
    // Rota para excluir um projeto
    app.delete('/projects/:id', (req, res) => {
        const { id } = req.params;
    
        // Primeiro, exclua as entradas relacionadas na tabela equipe_projeto
        const sqlDeleteTeam = 'DELETE FROM equipe_projeto WHERE projeto_id = ?';
        db.query(sqlDeleteTeam, [id], (err) => {
            if (err) {
                console.error('Erro ao remover equipe do projeto:', err);
                return res.status(500).json({ message: 'Erro ao remover equipe do projeto' });
            }
    
            // Agora, exclua o projeto
            const sqlDeleteProject = 'DELETE FROM projetos WHERE id = ?';
            db.query(sqlDeleteProject, [id], (err, results) => {
                if (err) {
                    console.error('Erro ao excluir projeto:', err);
                    return res.status(500).json({ message: 'Erro ao excluir projeto' });
                }
    
                if (results.affectedRows === 0) {
                    return res.status(404).json({ message: 'Projeto não encontrado' });
                }
    
                res.json({ message: 'Projeto excluído com sucesso' });
            });
        });
    });

// Rota para obter o próximo ID de backlog
app.get('/next-backlog-id', async (req, res) => {
    try {
        const [rows] = await db.promise().query('SELECT MAX(id) AS maxId FROM backlogs');
        const nextBacklogId = rows[0].maxId ? rows[0].maxId + 1 : 1;
        res.json({ nextBacklogId });
    } catch (error) {
        console.error('Erro ao obter o próximo ID de backlog:', error);
        res.status(500).json({ message: 'Erro ao obter o próximo ID de backlog' });
    }
});

// Rota para criar um novo backlog
app.post('/backlogs', async (req, res) => {
    const { codigo_projeto, nome, descricao, prazo, situacao } = req.body;

    try {
        const [result] = await db.promise().execute(
            'INSERT INTO backlogs (codigo_projeto, nome, descricao, prazo, situacao) VALUES (?, ?, ?, ?, ?)',
            [codigo_projeto, nome, descricao, prazo, situacao]
        );

        if (result.affectedRows === 1) {
            res.status(201).json({ message: 'Backlog criado com sucesso', backlogId: result.insertId });
        } else {
            throw new Error('Erro ao criar backlog');
        }
    } catch (error) {
        console.error('Erro ao criar backlog:', error);
        res.status(500).json({ message: 'Erro ao criar backlog' });
    }
});

// Rota para obter todos os projetos
app.get('/projects-list', async (req, res) => {
    try {
        const [rows] = await db.promise().query(
            'SELECT id, nome FROM projetos'
        );
        res.json(rows);
    } catch (error) {
        console.error('Erro ao buscar lista de projetos:', error);
        res.status(500).json({ message: 'Erro ao buscar lista de projetos' });
    }
});

// Iniciar o servidor
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});