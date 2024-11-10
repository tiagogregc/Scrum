// Função para carregar o próximo ID da matrícula e lista de pessoas
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Fetch the next matricula ID
        const response = await fetch('http://localhost:3000/next-matricula');
        const result = await response.json();
        if (response.ok) {
            const matriculaElement = document.getElementById('matricula');
            if (matriculaElement) {
                matriculaElement.value = result.nextMatricula;
            } else {
                console.error('Elemento para o próximo ID da matrícula não encontrado.');
            }
        } else {
            console.error('Erro ao buscar próximo ID da matrícula:', result.message);
        }

        // Fetch and populate the Product Owner, Scrum Master, and Team selection lists
        const personsResponse = await fetch('http://localhost:3000/persons');
        const persons = await personsResponse.json();
        if (personsResponse.ok) {
            const productOwnerSelect = document.getElementById('product-owner');
            const scrumMasterSelect = document.getElementById('scrum-master');
            const teamSelect = document.getElementById('team');

            if (productOwnerSelect && scrumMasterSelect && teamSelect) {
                persons.forEach(person => {
                    const option = document.createElement('option');
                    option.value = person.matricula;
                    option.textContent = person.nome;
                    productOwnerSelect.appendChild(option.cloneNode(true));
                    scrumMasterSelect.appendChild(option.cloneNode(true));

                    // Adiciona a opção de equipe com a mesma matrícula
                    const teamOption = document.createElement('option');
                    teamOption.value = person.matricula;
                    teamOption.textContent = person.nome;
                    teamSelect.appendChild(teamOption);
                });
            } else {
                console.error('Elementos para seleção não encontrados.');
            }
        } else {
            console.error('Erro ao buscar pessoas:', persons.message);
        }
    } catch (error) {
        console.error('Erro na requisição:', error);
    }
});

// Função para carregar os dados da pessoa para edição
async function loadPerson(matricula) {
    try {
        const response = await fetch(`http://localhost:3000/persons/${matricula}`);
        const person = await response.json();
        if (response.ok) {
            document.getElementById('matricula').value = person.matricula;
            document.getElementById('nome').value = person.nome;
            document.getElementById('cargo').value = person.cargo;
            document.getElementById('matricula').disabled = true; // Desabilita o campo de matrícula
        } else {
            console.error('Erro ao buscar pessoa para edição:', person.message);
        }
    } catch (error) {
        console.error('Erro na requisição:', error);
    }
}

// Função para criar ou atualizar uma pessoa
const createPersonForm = document.getElementById('create-person-form');
if (createPersonForm) {
    createPersonForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const matricula = document.getElementById('matricula').value;
        const nome = document.getElementById('nome').value;
        const cargo = document.getElementById('cargo').value;

        try {
            let response;
            if (document.getElementById('matricula').disabled) {
                // Atualiza a pessoa existente
                response = await fetch(`http://localhost:3000/persons/${matricula}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ nome, cargo }),
                });
            } else {
                // Cria uma nova pessoa
                response = await fetch('http://localhost:3000/person', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ matricula, nome, cargo }),
                });
            }

            const result = await response.json();

            if (response.ok) {
                alert('Pessoa cadastrada/atualizada com sucesso! ID: ' + result.id);
                // Clear form and refresh matricula ID
                createPersonForm.reset();
                document.getElementById('matricula').disabled = false;
                const refreshResponse = await fetch('http://localhost:3000/next-matricula');
                const refreshResult = await refreshResponse.json();
                if (refreshResponse.ok) {
                    document.getElementById('matricula').value = refreshResult.nextMatricula;
                }
            } else {
                alert('Erro ao cadastrar/atualizar pessoa: ' + result.message);
            }
        } catch (error) {
            console.error('Erro na requisição:', error);
            alert('Erro na requisição');
        }
    });
} else {
    console.error('Formulário de criação de pessoa não encontrado.');
}

// Função para excluir uma pessoa
const deletePersonButton = document.getElementById('delete-person');
if (deletePersonButton) {
    deletePersonButton.addEventListener('click', async () => {
        const matricula = document.getElementById('matricula').value;
        if (!matricula) {
            alert('Nenhuma pessoa selecionada para exclusão.');
            return;
        }

        if (confirm('Deseja realmente excluir esta pessoa?')) {
            try {
                const response = await fetch(`http://localhost:3000/persons/${matricula}`, {
                    method: 'DELETE',
                });

                const result = await response.json();

                if (response.ok) {
                    alert('Pessoa excluída com sucesso!');
                    // Clear form and refresh matricula ID
                    document.getElementById('create-person-form').reset();
                    document.getElementById('matricula').disabled = false;
                    const refreshResponse = await fetch('http://localhost:3000/next-matricula');
                    const refreshResult = await refreshResponse.json();
                    if (refreshResponse.ok) {
                        document.getElementById('matricula').value = refreshResult.nextMatricula;
                    }
                    // Refresh the list of people
                    const fetchPersonsButton = document.getElementById('fetch-persons');
                    if (fetchPersonsButton) {
                        fetchPersonsButton.click();
                    }
                } else {
                    alert('Erro ao excluir pessoa: ' + result.message);
                }
            } catch (error) {
                console.error('Erro na requisição:', error);
                alert('Erro na requisição');
            }
        }
    });
} else {
    console.error('Botão de excluir pessoa não encontrado.');
}

// Função para listar pessoas
const fetchPersonsButton = document.getElementById('fetch-persons');
if (fetchPersonsButton) {
    fetchPersonsButton.addEventListener('click', async () => {
        try {
            const response = await fetch('http://localhost:3000/persons');
            const result = await response.json();

            if (response.ok) {
                const personTableBody = document.getElementById('person-table-body');
                if (personTableBody) {
                    personTableBody.innerHTML = ''; // Limpa a tabela antes de adicionar novos itens
                    result.forEach(person => {
                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td>${person.matricula}</td>
                            <td>${person.nome}</td>
                            <td>${person.cargo}</td>
                        `;
                        row.addEventListener('dblclick', () => {
                            loadPerson(person.matricula); // Carrega os dados da pessoa para edição
                        });
                        personTableBody.appendChild(row);
                    });
                } else {
                    console.error('Elemento para tabela de pessoas não encontrado.');
                }
            } else {
                alert('Erro ao buscar pessoas: ' + result.message);
            }
        } catch (error) {
            console.error('Erro na requisição:', error);
            alert('Erro na requisição');
        }
    });
} else {
    console.error('Botão de buscar pessoas não encontrado.');
}

// Função para carregar a lista de pessoas e exibir o próximo ID no campo "projeto-id" (sem envio na criação)
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Obtenha o próximo ID para exibir no front-end
        const projectResponse = await fetch('http://localhost:3000/next-project-id');
        const projectResult = await projectResponse.json();
        if (projectResponse.ok) {
            const projectIdElement = document.getElementById('project-id');
            if (projectIdElement) {
                projectIdElement.value = projectResult.nextProjectId;
                projectIdElement.disabled = true; // Desativar o campo para evitar envio no formulário
            } else {
                console.error('Elemento para o próximo ID do projeto não encontrado.');
            }
        } else {
            console.error('Erro ao buscar próximo ID do projeto:', projectResult.message);
        }

        // Fetch and populate the Product Owner, Scrum Master, and Team selection lists
        const personsResponse = await fetch('http://localhost:3000/persons');
        const persons = await personsResponse.json();
        if (personsResponse.ok) {
            const productOwnerSelect = document.getElementById('product-owner');
            const scrumMasterSelect = document.getElementById('scrum-master');
            const teamSelect = document.getElementById('team');

            if (productOwnerSelect && scrumMasterSelect && teamSelect) {
                productOwnerSelect.innerHTML = '<option value="">Selecione o Product Owner</option>';
                scrumMasterSelect.innerHTML = '<option value="">Selecione o Scrum Master</option>';
                teamSelect.innerHTML = '';

                persons.forEach(person => {
                    const option = document.createElement('option');
                    option.value = person.matricula;
                    option.textContent = person.nome;

                    productOwnerSelect.appendChild(option.cloneNode(true));
                    scrumMasterSelect.appendChild(option.cloneNode(true));

                    const teamOption = document.createElement('option');
                    teamOption.value = person.matricula;
                    teamOption.textContent = person.nome;
                    teamSelect.appendChild(teamOption);
                });
            } else {
                console.error('Elementos para seleção não encontrados.');
            }
        } else {
            console.error('Erro ao buscar pessoas:', persons.message);
        }
    } catch (error) {
        console.error('Erro na requisição:', error);
    }
});

// Função para verificar se o projeto já existe no banco de dados
async function checkProjectExists(projectId) {
    const response = await fetch(`http://localhost:3000/projects/check-existence/${projectId}`);
    const result = await response.json();
    return result.exists;
}

// Função para submeter o formulário de criação ou atualização de projeto
let isSubmitting = false;

async function submitForm(event) {
    event.preventDefault();

    if (isSubmitting) return;
    isSubmitting = true;

    const nome = document.getElementById('project-nome').value.trim();
    const productOwner = document.getElementById('product-owner').value;
    const scrumMaster = document.getElementById('scrum-master').value;
    const teamMembers = Array.from(document.getElementById('team').selectedOptions)
        .map(option => option.value);

    if (!nome || !productOwner || !scrumMaster || teamMembers.length === 0) {
        alert("Por favor, preencha todos os campos obrigatórios.");
        isSubmitting = false;
        return;
    }

    const projectData = {
        nome,
        product_owner_matricula: productOwner,
        scrum_master_matricula: scrumMaster,
        team_members: teamMembers
    };

    try {
        const projectIdElement = document.getElementById('project-id');
        const projectId = projectIdElement ? projectIdElement.value.trim() : null;
        const isUpdate = await checkProjectExists(projectId);

        if (isUpdate) {
            console.log('Atualizando projeto:', projectId);
            await fetch(`http://localhost:3000/projects/${projectId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(projectData)
            });
            alert('Projeto atualizado com sucesso!');
        } else {
            console.log('Criando novo projeto');
            const response = await fetch('http://localhost:3000/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(projectData)
            });
            const data = await response.json();
            alert('Projeto criado com sucesso com ID: ' + data.projectId);
        }

        window.location.reload();
    } catch (error) {
        console.error('Erro ao salvar o projeto:', error);
        alert('Erro ao salvar o projeto: ' + error.message);
    } finally {
        isSubmitting = false;
    }
}

// Função para adicionar membros à equipe após a criação do projeto
function addTeamMembers(projectId, teamMembers) {
    const teamData = teamMembers.map(pessoa_id => ({
        projeto_id: projectId,
        pessoa_id: pessoa_id
    }));

    return fetch('http://localhost:3000/addTeamMembers', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ members: teamData })
    })
        .then(response => {
            if (!response.ok) throw new Error('Erro ao adicionar membros à equipe');
            return response.json();
        })
        .catch(error => {
            console.error('Erro ao adicionar membros à equipe:', error);
            throw error;
        });
}

// Função para carregar a lista de projetos
document.addEventListener('DOMContentLoaded', function () {
    const listProjectsButton = document.getElementById('list-projects');
    const projectsTableBody = document.getElementById('projects-table-body');
    let currentProjectId = null;

    function loadProjects() {
        fetch('http://localhost:3000/projects')
            .then(response => response.json())
            .then(projects => {
                projectsTableBody.innerHTML = '';
                projects.forEach(project => {
                    const row = document.createElement('tr');
                    row.dataset.id = project.id;
                    row.innerHTML = `
                        <td>${project.id}</td>
                        <td>${project.nome}</td>
                        <td>${project.product_owner_nome}</td>
                        <td>${project.scrum_master_nome}</td>
                        <td>${project.equipe}</td>
                    `;
                    row.addEventListener('dblclick', () => {
                        currentProjectId = project.id;
                        loadProjectData(currentProjectId);
                    });
                    projectsTableBody.appendChild(row);
                });
            })
            .catch(error => {
                console.error('Erro ao carregar lista de projetos:', error);
                alert('Erro ao carregar lista de projetos');
            });
    }

    function loadProjectData(projectId) {
        fetch(`http://localhost:3000/projects/${projectId}`)
            .then(response => response.json())
            .then(project => {
                document.getElementById('project-id').value = project.id;
                document.getElementById('project-nome').value = project.nome;

                fetch('http://localhost:3000/persons')
                    .then(response => response.json())
                    .then(persons => {
                        const productOwnerSelect = document.getElementById('product-owner');
                        const scrumMasterSelect = document.getElementById('scrum-master');

                        productOwnerSelect.innerHTML = '<option value="">Selecione o Product Owner</option>';
                        scrumMasterSelect.innerHTML = '<option value="">Selecione o Scrum Master</option>';

                        persons.forEach(person => {
                            const poOption = document.createElement('option');
                            poOption.value = person.matricula;
                            poOption.textContent = person.nome;
                            productOwnerSelect.appendChild(poOption);

                            const smOption = document.createElement('option');
                            smOption.value = person.matricula;
                            smOption.textContent = person.nome;
                            scrumMasterSelect.appendChild(smOption);
                        });

                        if (productOwnerSelect && project.product_owner_matricula !== undefined) {
                            productOwnerSelect.value = project.product_owner_matricula;
                        }

                        if (scrumMasterSelect && project.scrum_master_matricula !== undefined) {
                            scrumMasterSelect.value = project.scrum_master_matricula;
                        }
                    });

                fetch(`http://localhost:3000/project/${projectId}/team-members`)
                    .then(response => response.json())
                    .then(data => {
                        const teamSelect = document.getElementById('team');
                        teamSelect.innerHTML = '';

                        data.forEach(member => {
                            const option = document.createElement('option');
                            option.value = member.matricula;
                            option.textContent = member.nome;
                            option.selected = member.selected;
                            teamSelect.appendChild(option);
                        });
                    })
                    .catch(error => {
                        console.error('Erro ao carregar dados da equipe:', error);
                    });
            })
            .catch(error => {
                console.error('Erro ao carregar dados do projeto:', error);
                alert('Erro ao carregar dados do projeto');
            });
    }

    listProjectsButton.addEventListener('click', loadProjects);
});

// Adicione o listener de submit
document.getElementById('create-project-form').addEventListener('submit', submitForm);

// Função para excluir um projeto
document.getElementById('delete-project').addEventListener('click', async () => {
    const projectId = document.getElementById('project-id').value;

    if (!projectId) {
        alert('Por favor, selecione um projeto para excluir.');
        return;
    }

    const confirmDelete = confirm('Tem certeza que deseja excluir este projeto?');

    if (!confirmDelete) {
        return;
    }

    try {
        const response = await fetch(`http://localhost:3000/projects/${projectId}`, {
            method: 'DELETE',
        });

        if (response.ok) {
            alert('Projeto excluído com sucesso!');
            window.location.reload(); // Recarrega a página
        } else {
            alert('Erro ao excluir o projeto.');
        }
    } catch (error) {
        console.error('Erro ao excluir o projeto:', error);
        alert('Erro ao excluir o projeto: ' + error.message);
    }
});

// Função para limpar o formulário
function clearForm() {
    document.getElementById('project-id').value = '';
    document.getElementById('project-nome').value = '';
    document.getElementById('product-owner').selectedIndex = 0;
    document.getElementById('scrum-master').selectedIndex = 0;
    const teamSelect = document.getElementById('team');
    Array.from(teamSelect.selectedOptions).forEach(option => option.selected = false); // Deselect all team members
}