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

// Função para carregar o próximo ID do projeto e a lista de pessoas
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Fetch the next project ID
        const projectResponse = await fetch('http://localhost:3000/next-project-id');
        const projectResult = await projectResponse.json();
        if (projectResponse.ok) {
            const projectIdElement = document.getElementById('project-id');
            if (projectIdElement) {
                projectIdElement.value = projectResult.nextProjectId; // Define o valor do campo ID do projeto
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
                // Limpa as opções duplicadas antes de adicionar novas
                productOwnerSelect.innerHTML = '<option value="">Selecione o Product Owner</option>';
                scrumMasterSelect.innerHTML = '<option value="">Selecione o Scrum Master</option>';
                teamSelect.innerHTML = '';

                // Preenche as listas suspensas
                persons.forEach(person => {
                    const option = document.createElement('option');
                    option.value = person.matricula;
                    option.textContent = person.nome;

                    // Adiciona a opção ao Product Owner e Scrum Master
                    productOwnerSelect.appendChild(option.cloneNode(true));
                    scrumMasterSelect.appendChild(option.cloneNode(true));

                    // Adiciona a opção de equipe
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

// Função para criar um projeto
const createProjectForm = document.getElementById('create-project-form');
if (createProjectForm) {
    createProjectForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nome = document.getElementById('project-nome').value;
        const productOwner = document.getElementById('product-owner').value;
        const scrumMaster = document.getElementById('scrum-master').value;

        // Obter IDs da equipe selecionada
        const teamSelect = document.getElementById('team');
        const teamIds = teamSelect ? Array.from(teamSelect.selectedOptions).map(option => option.value) : [];

        try {
            const response = await fetch('http://localhost:3000/projects', {  // Alteração aqui: de 'project' para 'projects'
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ nome, product_owner: productOwner, scrum_master: scrumMaster, team_ids: teamIds }),
            });

            const result = await response.json();

            if (response.ok) {
                alert('Projeto cadastrado com sucesso! ID: ' + result.projectId); // Corrigido para 'result.projectId'
                createProjectForm.reset();
                // Atualizar próximo ID do projeto
                const refreshResponse = await fetch('http://localhost:3000/next-project-id');
                const refreshResult = await refreshResponse.json();
                if (refreshResponse.ok) {
                    const projectIdElement = document.getElementById('project-id');
                    if (projectIdElement) {
                        projectIdElement.value = refreshResult.nextProjectId;
                    }
                }
            } else {
                alert('Erro ao cadastrar projeto: ' + result.message);
            }
        } catch (error) {
            console.error('Erro na requisição:', error);
            alert('Erro na requisição');
        }
    });
} else {
    console.error('Formulário de criação de projeto não encontrado.');
}

document.addEventListener('DOMContentLoaded', function () {
    const listProjectsButton = document.getElementById('list-projects');
    const projectsTableBody = document.getElementById('projects-table-body');
    let currentProjectId = null;

    // Função para carregar a lista de projetos
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

    // Função para carregar dados de um projeto específico (dois)
    // Função para carregar dados de um projeto específico
    function loadProjectData(projectId) {
        fetch(`http://localhost:3000/projects/${projectId}`)
            .then(response => response.json())
            .then(project => {
                document.getElementById('project-id').value = project.id;
                document.getElementById('project-nome').value = project.nome;

                // Carregar e preencher as listas suspensas de Product Owner e Scrum Master
                fetch('http://localhost:3000/persons')
                    .then(response => response.json())
                    .then(persons => {
                        const productOwnerSelect = document.getElementById('product-owner');
                        const scrumMasterSelect = document.getElementById('scrum-master');

                        // Limpar as listas suspensas antes de preenchê-las
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

                        // Definir o valor selecionado para Product Owner e Scrum Master
                        if (productOwnerSelect && project.product_owner_matricula !== undefined) {
                            productOwnerSelect.value = project.product_owner_matricula;
                        }

                        if (scrumMasterSelect && project.scrum_master_matricula !== undefined) {
                            scrumMasterSelect.value = project.scrum_master_matricula;
                        }
                    });

                // Carregar equipe
                fetch(`http://localhost:3000/project/${projectId}/team-members`)
                    .then(response => response.json())
                    .then(data => {
                        const teamSelect = document.getElementById('team');
                        teamSelect.innerHTML = '';

                        data.forEach(member => {
                            const option = document.createElement('option');
                            option.value = member.matricula;
                            option.textContent = member.nome;
                            option.selected = member.selected; // Define selected diretamente
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

    // Listar projetos ao clicar no botão
    listProjectsButton.addEventListener('click', loadProjects);

// Flag para evitar múltiplos envios
    let isSubmitting = false;

    function submitForm(event) {
        event.preventDefault();

        // Se já está submetendo, interrompe o processo
        if (isSubmitting) return;
        isSubmitting = true;

        const projectId = document.getElementById('project-id').value; // ID do projeto a ser alterado (se existir)
        const nome = document.getElementById('project-nome').value.trim();
        const productOwner = document.getElementById('product-owner').value;
        const scrumMaster = document.getElementById('scrum-master').value;
        const teamMembers = Array.from(document.getElementById('team').selectedOptions)
            .map(option => option.value);

        // Verificação para garantir que os dados estejam preenchidos
        if (!nome || !productOwner || !scrumMaster || teamMembers.length === 0) {
            alert("Por favor, preencha todos os campos obrigatórios.");
            isSubmitting = false;
            return;
        }

        // Preparar dados para envio
        const projectData = {
            nome,
            product_owner_matricula: productOwner, // Mudado para incluir o "matricula"
            scrum_master_matricula: scrumMaster, // Mudado para incluir o "matricula"
            team_members: teamMembers // Alterado para corresponder ao que o backend espera
        };

        console.log('Dados do projeto a serem enviados:', projectData);

        // Se temos um projectId, atualizar o projeto existente; senão, criar um novo
        if (projectId) {
            console.log('Atualizando projeto:', projectId);
            fetch(`http://localhost:3000/projects/${projectId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(projectData)
            })
                .then(response => {
                    if (!response.ok) throw new Error('Erro na atualização do projeto');
                    return response.json();
                })
                .then(data => {
                    alert('Projeto atualizado com sucesso!');
                    loadProjects(); // Atualiza a lista de projetos
                    clearForm(); // Limpa o formulário
                    isSubmitting = false;
                })
                .catch(error => {
                    console.error('Erro ao atualizar o projeto:', error);
                    alert('Erro ao atualizar o projeto');
                    isSubmitting = false;
                });
        } else {
            // Criando novo projeto
            console.log('Criando novo projeto');
            fetch('http://localhost:3000/projects', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(projectData)
            })
                .then(response => {
                    if (!response.ok) throw new Error('Erro na criação do projeto');
                    return response.json();
                })
                .then(data => {
                    alert('Projeto criado com sucesso!');
                    loadProjects();
                    clearForm();
                    isSubmitting = false;
                })
                .catch(error => {
                    console.error('Erro ao criar o projeto:', error);
                    alert('Erro ao criar o projeto');
                    isSubmitting = false;
                });
        }
    }

// Função para limpar o formulário
    function clearForm() {
        document.getElementById('project-id').value = '';
        document.getElementById('project-nome').value = '';
        document.getElementById('product-owner').value = '';
        document.getElementById('scrum-master').value = '';
        document.getElementById('team').value = '';
    }

// Adiciona o evento de envio ao botão Criar/Alterar Projeto
    document.getElementById('create-project-form').addEventListener('submit', submitForm);


});