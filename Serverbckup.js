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
    const { matricula } = req.params;

    // Iniciar uma transação para garantir integridade dos dados
    db.beginTransaction((err) => {
        if (err) {
            console.error('Erro ao iniciar a transação:', err);
            return res.status(500).json({ message: 'Erro ao iniciar a transação' });
        }

        // Remover associações da equipe
        db.query('DELETE FROM equipe_projeto WHERE pessoa_id = ?', [matricula], (err) => {
            if (err) {
                return db.rollback(() => {
                    console.error('Erro ao remover associações de equipe:', err);
                    res.status(500).json({ message: 'Erro ao remover associações de equipe' });
                });
            }

            // Excluir pessoa
            db.query('DELETE FROM pessoas WHERE matricula = ?', [matricula], (err, result) => {
                if (err) {
                    return db.rollback(() => {
                        console.error('Erro ao excluir pessoa:', err);
                        res.status(500).json({ message: 'Erro ao excluir pessoa' });
                    });
                }

                if (result.affectedRows === 0) {
                    return db.rollback(() => {
                        res.status(404).json({ message: 'Pessoa não encontrada' });
                    });
                }

                // Commit da transação
                db.commit((err) => {
                    if (err) {
                        return db.rollback(() => {
                            console.error('Erro ao finalizar a transação:', err);
                            res.status(500).json({ message: 'Erro ao finalizar a transação' });
                        });
                    }
                    res.json({ message: 'Pessoa excluída com sucesso!' });
                });
            });
        });
    });
});

// CRUD para projetos
app.post('/project', (req, res) => {
    const { nome, product_owner, scrum_master, team_ids } = req.body;
    const sqlProject = 'INSERT INTO projetos (nome, product_owner, scrum_master) VALUES (?, ?, ?)';

    db.query(sqlProject, [nome, product_owner, scrum_master], (err, result) => {
        if (err) {
            console.error('Erro ao criar projeto:', err);
            return res.status(500).json({ message: 'Erro ao criar projeto' });
        }

        const projetoId = result.insertId;

        // Inserir equipe
        if (team_ids && team_ids.length > 0) {
            const sqlTeam = 'INSERT INTO equipe_projeto (projeto_id, pessoa_id) VALUES ?';
            const teamValues = team_ids.map(pessoaId => [projetoId, pessoaId]);

            db.query(sqlTeam, [teamValues], (err) => {
                if (err) {
                    console.error('Erro ao adicionar equipe ao projeto:', err);
                    return res.status(500).json({ message: 'Erro ao adicionar equipe ao projeto' });
                }

                res.status(201).json({ id: projetoId });
            });
        } else {
            // Se não há equipe, responder com sucesso
            res.status(201).json({ id: projetoId });
        }
    });
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
            po.nome AS product_owner_nome, 
            sm.nome AS scrum_master_nome,
            GROUP_CONCAT(e.nome SEPARATOR ', ') AS equipe
        FROM projetos p
        LEFT JOIN pessoas po ON p.product_owner = po.matricula
        LEFT JOIN pessoas sm ON p.scrum_master = sm.matricula
        LEFT JOIN equipe_projeto ep ON p.id = ep.projeto_id
        LEFT JOIN pessoas e ON ep.pessoa_id = e.matricula
        WHERE p.id = ?
        GROUP BY p.id, p.nome, po.nome, sm.nome
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
    const { nome, product_owner, scrum_master, team_ids } = req.body;

    // Atualizar o projeto
    const sqlProject = 'UPDATE projetos SET nome = ?, product_owner = ?, scrum_master = ? WHERE id = ?';

    db.query(sqlProject, [nome, product_owner, scrum_master, id], (err) => {
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

            if (team_ids && team_ids.length > 0) {
                const insertTeamQuery = 'INSERT INTO equipe_projeto (projeto_id, pessoa_id) VALUES ?';
                const teamValues = team_ids.map(pessoaId => [id, pessoaId]);

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

    db.query('DELETE FROM equipe_projeto WHERE projeto_id = ?', [id], (err) => {
        if (err) {
            console.error('Erro ao remover equipe do projeto:', err);
            return res.status(500).json({ message: 'Erro ao remover equipe do projeto' });
        }

        db.query('DELETE FROM projetos WHERE id = ?', [id], (err, result) => {
            if (err) {
                console.error('Erro ao excluir projeto:', err);
                return res.status(500).json({ message: 'Erro ao excluir projeto' });
            }

            if (result.affectedRows === 0) {
                res.status(404).json({ message: 'Projeto não encontrado' });
            } else {
                res.json({ message: 'Projeto excluído com sucesso!' });
            }
        });
    });
});

// Iniciar o servidor
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});

/*const express = require('express');
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
    const { matricula } = req.params;

    // Iniciar uma transação para garantir integridade dos dados
    db.beginTransaction((err) => {
        if (err) {
            console.error('Erro ao iniciar a transação:', err);
            return res.status(500).json({ message: 'Erro ao iniciar a transação' });
        }

        // Remover associações da equipe
        db.query('DELETE FROM equipe_projeto WHERE pessoa_id = ?', [matricula], (err) => {
            if (err) {
                return db.rollback(() => {
                    console.error('Erro ao remover associações de equipe:', err);
                    res.status(500).json({ message: 'Erro ao remover associações de equipe' });
                });
            }

            // Excluir pessoa
            db.query('DELETE FROM pessoas WHERE matricula = ?', [matricula], (err, result) => {
                if (err) {
                    return db.rollback(() => {
                        console.error('Erro ao excluir pessoa:', err);
                        res.status(500).json({ message: 'Erro ao excluir pessoa' });
                    });
                }

                if (result.affectedRows === 0) {
                    return db.rollback(() => {
                        res.status(404).json({ message: 'Pessoa não encontrada' });
                    });
                }

                // Commit da transação
                db.commit((err) => {
                    if (err) {
                        return db.rollback(() => {
                            console.error('Erro ao finalizar a transação:', err);
                            res.status(500).json({ message: 'Erro ao finalizar a transação' });
                        });
                    }
                    res.json({ message: 'Pessoa excluída com sucesso!' });
                });
            });
        });
    });
});

// CRUD para projetos
app.post('/projects', (req, res) => {
    const { nome, product_owner, scrum_master, team_ids } = req.body;

    const sqlInsertProject = 'INSERT INTO projetos (nome, product_owner, scrum_master) VALUES (?, ?, ?)';
    db.query(sqlInsertProject, [nome, product_owner, scrum_master], (err, result) => {
        if (err) {
            console.error('Erro ao criar projeto:', err);
            return res.status(500).json({ message: 'Erro ao criar projeto' });
        }

        const projectId = result.insertId;

        if (team_ids && team_ids.length > 0) {
            const insertTeamQuery = 'INSERT INTO equipe_projeto (projeto_id, pessoa_id) VALUES ?';
            const teamValues = team_ids.map(pessoaId => [projectId, pessoaId]);

            db.query(insertTeamQuery, [teamValues], (err) => {
                if (err) {
                    console.error('Erro ao adicionar equipe ao projeto:', err);
                    return res.status(500).json({ message: 'Erro ao adicionar equipe ao projeto' });
                }

                res.json({ message: 'Projeto criado com sucesso' });
            });
        } else {
            res.json({ message: 'Projeto criado com sucesso' });
        }
    });
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
    const { nome, product_owner, scrum_master, team_ids } = req.body;

    // Atualizar o projeto
    const sqlProject = 'UPDATE projetos SET nome = ?, product_owner = ?, scrum_master = ? WHERE id = ?';
    db.query(sqlProject, [nome, product_owner, scrum_master, id], (err) => {
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

            if (team_ids && team_ids.length > 0) {
                const insertTeamQuery = 'INSERT INTO equipe_projeto (projeto_id, pessoa_id) VALUES ?';
                const teamValues = team_ids.map(pessoaId => [id, pessoaId]);

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

// Endpoint para excluir um projeto
app.delete('/projects/:id', (req, res) => {
    const projectId = req.params.id;

    // Começar a transação
    db.beginTransaction((err) => {
        if (err) {
            console.error('Erro ao iniciar a transação:', err);
            return res.status(500).json({ message: 'Erro ao iniciar a transação' });
        }

        // Excluir registros relacionados na tabela equipe_projeto
        const deleteTeamQuery = 'DELETE FROM equipe_projeto WHERE projeto_id = ?';
        db.query(deleteTeamQuery, [projectId], (err) => {
            if (err) {
                console.error('Erro ao excluir registros de equipe:', err);
                return db.rollback(() => {
                    res.status(500).json({ message: 'Erro ao excluir registros de equipe' });
                });
            }

            // Excluir o projeto
            const deleteProjectQuery = 'DELETE FROM projetos WHERE id = ?';
            db.query(deleteProjectQuery, [projectId], (err) => {
                if (err) {
                    console.error('Erro ao excluir projeto:', err);
                    return db.rollback(() => {
                        res.status(500).json({ message: 'Erro ao excluir projeto' });
                    });
                }

                // Confirmar a transação
                db.commit((err) => {
                    if (err) {
                        console.error('Erro ao confirmar a transação:', err);
                        return db.rollback(() => {
                            res.status(500).json({ message: 'Erro ao confirmar a transação' });
                        });
                    }

                    res.json({ message: 'Projeto excluído com sucesso' });
                });
            });
        });
    });
});

// Iniciar o servidor
app.listen(3000, () => {
    console.log('Servidor rodando na porta 3000');
});*/