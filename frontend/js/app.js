
let API_URL = 'http://localhost:3000/api';
let currentUser = null;
let token = localStorage.getItem('token');
let carrinho = JSON.parse(localStorage.getItem('carrinho')) || [];


async function discoverServerPort() {
    const ports = [3000, 3001, 3002, 8080, 8081, 9999, 4000, 5000, 5001];
    
    for (let port of ports) {
        try {
            const response = await fetch(`http://localhost:${port}/api/test`, {
                method: 'GET'
            });
            if (response.ok) {
                return port;
            }
        } catch (e) {
            continue;
        }
    }
    return 3000; 
}


document.addEventListener('DOMContentLoaded', async function() {
    const port = await discoverServerPort();
    API_URL = `http://localhost:${port}/api`;
    console.log('🌐 Conectado na porta:', port);
    
    if (token) {
        checkAuth();
    }
    document.getElementById('loginForm').addEventListener('submit', login);
    document.getElementById('registerForm').addEventListener('submit', register);
});

function showLogin() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('registerScreen').style.display = 'none';
    document.getElementById('clientDashboard').style.display = 'none';
    document.getElementById('empresaDashboard').style.display = 'none';
    document.getElementById('adminDashboard').style.display = 'none';
    document.getElementById('userInfo').style.display = 'none';
}

function showRegister() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('registerScreen').style.display = 'flex';
    document.getElementById('clientDashboard').style.display = 'none';
    document.getElementById('empresaDashboard').style.display = 'none';
    document.getElementById('adminDashboard').style.display = 'none';
    document.getElementById('userInfo').style.display = 'none';
}

async function login(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const senha = document.getElementById('loginPassword').value;

    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, senha })
        });

        const data = await response.json();

        if (response.ok) {
            token = data.token;
            localStorage.setItem('token', token);
            currentUser = data.user;
            showDashboard();
        } else {
            alert(data.error);
        }
    } catch (error) {
        alert('Erro ao fazer login: ' + error.message);
    }
}

async function register(e) {
    e.preventDefault();
    
    const userData = {
        email: document.getElementById('registerEmail').value,
        senha: document.getElementById('registerPassword').value,
        tipo: document.getElementById('registerType').value,
        nome: document.getElementById('registerName').value,
        telefone: document.getElementById('registerPhone').value,
        endereco: document.getElementById('registerAddress').value
    };

    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });

        const data = await response.json();

        if (response.ok) {
            alert('Cadastro realizado com sucesso! Faça login.');
            showLogin();
            document.getElementById('registerForm').reset();
        } else {
            alert(data.error);
        }
    } catch (error) {
        alert('Erro ao cadastrar: ' + error.message);
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('carrinho');
    token = null;
    currentUser = null;
    carrinho = [];
    showLogin();
}

async function checkAuth() {
    try {
        const response = await fetch(`${API_URL}/test`);
        if (response.ok) {
            const payload = JSON.parse(atob(token.split('.')[1]));
            currentUser = payload;
            showDashboard();
        }
    } catch (error) {
        logout();
    }
}

function showDashboard() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('registerScreen').style.display = 'none';
    document.getElementById('clientDashboard').style.display = 'none';
    document.getElementById('empresaDashboard').style.display = 'none';
    document.getElementById('adminDashboard').style.display = 'none';

    document.getElementById('userInfo').style.display = 'flex';
    document.getElementById('userName').textContent = currentUser.nome;

    switch(currentUser.tipo) {
        case 'cliente':
            document.getElementById('clientDashboard').style.display = 'block';
            document.getElementById('clientDashboard').innerHTML = `
                <div class="container-fluid">
                    <div class="row mb-4">
                        <div class="col-12">
                            <div class="d-flex justify-content-between align-items-center">
                                <h2>Bem-vindo, ${currentUser.nome}!</h2>
                                <button class="btn btn-outline-primary" onclick="mostrarMeusPedidos()">
                                    📦 Meus Pedidos
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-md-8">
                            <h4>🏪 Estabelecimentos</h4>
                            <div id="estabelecimentosList"></div>
                        </div>
                        <div class="col-md-4">
                            <h4>🛒 Seu Carrinho</h4>
                            <div id="carrinho">Carrinho vazio</div>
                        </div>
                    </div>
                </div>
            `;
            loadEstabelecimentos();
            break;
        case 'empresa':
            document.getElementById('empresaDashboard').style.display = 'block';
            loadMeusEstabelecimentos();
            break;
        case 'admin':
            document.getElementById('adminDashboard').style.display = 'block';
            loadEmpresasPendentes();
            loadUsuarios();
            break;
    }
}

async function loadEstabelecimentos() {
    try {
        const response = await fetch(`${API_URL}/estabelecimentos`);
        const estabelecimentos = await response.json();
        
        const container = document.getElementById('estabelecimentosList');
        container.innerHTML = '';
        
        if (estabelecimentos.length === 0) {
            container.innerHTML = '<p class="text-muted">Nenhum estabelecimento cadastrado ainda.</p>';
            return;
        }
        
        estabelecimentos.forEach(estab => {
            const card = document.createElement('div');
            card.className = 'card mb-3 estabelecimento-card';
            card.innerHTML = `
                <div class="card-body">
                    <h5 class="card-title">${estab.nome}</h5>
                    <p class="card-text">${estab.descricao || 'Sem descrição'}</p>
                    <p class="card-text"><small class="text-muted">${estab.categoria} • ${estab.endereco}</small></p>
                    <button class="btn btn-primary btn-sm" onclick="verCardapio(${estab.id})">Ver Cardápio</button>
                </div>
            `;
            container.appendChild(card);
        });
    } catch (error) {
        console.error('Erro ao carregar estabelecimentos:', error);
        document.getElementById('estabelecimentosList').innerHTML = '<p class="text-danger">Erro ao carregar estabelecimentos</p>';
    }
}

function verCardapio(estabId) {
    document.getElementById('clientDashboard').innerHTML = '';
    
    const cardapioHTML = `
        <div class="container-fluid">
            <div class="row">
                <div class="col-md-8">
                    <div class="d-flex justify-content-between align-items-center mb-4">
                        <h3 id="cardapioTitulo" class="text-primary">Carregando cardápio...</h3>
                        <button class="btn btn-outline-secondary" onclick="voltarParaEstabelecimentos()">
                            ← Voltar para Lojas
                        </button>
                    </div>
                    <div id="cardapioProdutos"></div>
                </div>
                
                <div class="col-md-4">
                    <div class="card sticky-top" style="top: 20px;">
                        <div class="card-header bg-primary text-white">
                            <h5 class="mb-0">🛒 Seu Carrinho</h5>
                        </div>
                        <div class="card-body">
                            <div id="itensCarrinho" style="max-height: 400px; overflow-y: auto;">
                                <p class="text-muted text-center">Carrinho vazio</p>
                            </div>
                            <div class="border-top pt-3">
                                <div class="d-flex justify-content-between align-items-center mb-3">
                                    <strong>Total:</strong>
                                    <strong id="totalCarrinho" class="text-success">R$ 0,00</strong>
                                </div>
                                <button class="btn btn-success w-100" onclick="finalizarPedido(${estabId})" id="btnFinalizar" disabled>
                                    ✅ Finalizar Pedido
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('clientDashboard').innerHTML = cardapioHTML;
    document.getElementById('clientDashboard').style.display = 'block';
    
    carregarCardapioCliente(estabId);
    atualizarCarrinho();
}

function mostrarMeusPedidos() {
    console.log('📦 Mostrar Meus Pedidos clicado');
    
    document.getElementById('clientDashboard').innerHTML = '';
    
    const pedidosHTML = `
        <div class="container-fluid">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h2>📦 Meus Pedidos</h2>
                <button class="btn btn-outline-primary" onclick="voltarParaEstabelecimentos()">
                    ← Voltar para Lojas
                </button>
            </div>
            <div id="listaPedidosCliente">
                <div class="text-center">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Carregando...</span>
                    </div>
                    <p class="mt-2">Carregando seus pedidos...</p>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('clientDashboard').innerHTML = pedidosHTML;
    document.getElementById('clientDashboard').style.display = 'block';
    
    carregarMeusPedidos();
}

async function carregarMeusPedidos() {
    try {
        console.log('🔍 Buscando pedidos do cliente...');
        
        const response = await fetch(`${API_URL}/pedidos/meus`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }

        const pedidos = await response.json();
        console.log('📦 Pedidos recebidos:', pedidos);
        
        const container = document.getElementById('listaPedidosCliente');

        if (!pedidos || pedidos.length === 0) {
            container.innerHTML = `
                <div class="alert alert-info text-center">
                    <h5>📭 Nenhum pedido encontrado</h5>
                    <p>Você ainda não fez nenhum pedido.</p>
                    <button class="btn btn-primary mt-2" onclick="voltarParaEstabelecimentos()">
                        🏪 Fazer Primeiro Pedido
                    </button>
                </div>
            `;
            return;
        }

        let html = '';
        pedidos.forEach(pedido => {
            const data = new Date(pedido.data_pedido).toLocaleString('pt-BR');
            const statusInfo = getStatusInfo(pedido.status);
            
            html += `
                <div class="card mb-3">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <div>
                            <strong>Pedido #${pedido.id}</strong>
                            <small class="text-muted ms-2">${data}</small>
                        </div>
                        <span class="badge ${statusInfo.class}">${statusInfo.text}</span>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-6">
                                <h6>${pedido.estabelecimento_nome || 'Estabelecimento'}</h6>
                                <p class="mb-1"><strong>Total:</strong> R$ ${parseFloat(pedido.total).toFixed(2)}</p>
                                <p class="mb-0"><strong>Endereço:</strong> ${pedido.endereco_entrega}</p>
                            </div>
                            <div class="col-md-6 text-end">
                                <button class="btn btn-info btn-sm" onclick="verDetalhesPedido(${pedido.id})">
                                    👁️ Ver Detalhes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
        
    } catch (error) {
        console.error('❌ Erro ao carregar pedidos:', error);
        const container = document.getElementById('listaPedidosCliente');
        container.innerHTML = `
            <div class="alert alert-danger">
                <h5>❌ Erro ao carregar pedidos</h5>
                <p>${error.message}</p>
                <button class="btn btn-secondary mt-2" onclick="carregarMeusPedidos()">
                    🔄 Tentar Novamente
                </button>
            </div>
        `;
    }
}

function voltarParaEstabelecimentos() {
    document.getElementById('clientDashboard').innerHTML = `
        <div class="container-fluid">
            <div class="row mb-4">
                <div class="col-12">
                    <div class="d-flex justify-content-between align-items-center">
                        <h2>Bem-vindo, ${currentUser.nome}!</h2>
                        <button class="btn btn-outline-primary" onclick="mostrarMeusPedidos()">
                            📦 Meus Pedidos
                        </button>
                    </div>
                </div>
            </div>
            <div class="row">
                <div class="col-md-8">
                    <h4>🏪 Estabelecimentos</h4>
                    <div id="estabelecimentosList"></div>
                </div>
                <div class="col-md-4">
                    <h4>🛒 Seu Carrinho</h4>
                    <div id="carrinho">Carrinho vazio</div>
                </div>
            </div>
        </div>
    `;
    
    carrinho = [];
    localStorage.removeItem('carrinho');
    loadEstabelecimentos();
}



async function carregarCardapioCliente(estabId) {
    try {
        const response = await fetch(`${API_URL}/estabelecimentos/${estabId}/produtos`);
        const produtos = await response.json();
        
        const responseEstab = await fetch(`${API_URL}/estabelecimentos`);
        const estabelecimentos = await responseEstab.json();
        const estabelecimento = estabelecimentos.find(e => e.id === estabId);
        
        document.getElementById('cardapioTitulo').textContent = `Cardápio - ${estabelecimento?.nome || 'Estabelecimento'}`;
        
        const container = document.getElementById('cardapioProdutos');
        
        if (produtos.length === 0) {
            container.innerHTML = `
                <div class="alert alert-info">
                    <h5>😔 Cardápio Vazio</h5>
                    <p class="mb-0">Este estabelecimento ainda não possui produtos cadastrados.</p>
                </div>
            `;
            return;
        }
        
        const produtosPorCategoria = {};
        produtos.forEach(produto => {
            const categoria = produto.categoria || 'Diversos';
            if (!produtosPorCategoria[categoria]) {
                produtosPorCategoria[categoria] = [];
            }
            produtosPorCategoria[categoria].push(produto);
        });
        
        let html = '';
        for (const [categoria, produtosCategoria] of Object.entries(produtosPorCategoria)) {
            html += `
                <div class="card mb-4">
                    <div class="card-header bg-light">
                        <h4 class="mb-0">${categoria}</h4>
                    </div>
                    <div class="card-body">
                        <div class="row">
            `;
            
            produtosCategoria.forEach(produto => {
                html += `
                    <div class="col-lg-6 mb-3">
                        <div class="card h-100 border">
                            <div class="card-body">
                                <div class="d-flex justify-content-between align-items-start mb-2">
                                    <h5 class="card-title">${produto.nome}</h5>
                                    <span class="badge bg-success fs-6">R$ ${parseFloat(produto.preco).toFixed(2)}</span>
                                </div>
                                ${produto.descricao ? `<p class="card-text text-muted small">${produto.descricao}</p>` : ''}
                                <button class="btn btn-primary w-100 mt-2" onclick="adicionarAoCarrinho(${produto.id}, '${produto.nome.replace(/'/g, "\\'")}', ${produto.preco})">
                                    Adicionar ao Carrinho
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            });
            
            html += `
                        </div>
                    </div>
                </div>
            `;
        }
        
        container.innerHTML = html;
    } catch (error) {
        console.error('Erro ao carregar cardápio:', error);
        document.getElementById('cardapioProdutos').innerHTML = `
            <div class="alert alert-danger">
                <h5>❌ Erro ao carregar cardápio</h5>
                <p class="mb-0">Não foi possível carregar o cardápio deste estabelecimento.</p>
            </div>
        `;
    }
}
function adicionarAoCarrinho(produtoId, produtoNome, produtoPreco) {
    console.log('Adicionando ao carrinho:', produtoId, produtoNome, produtoPreco);
    
    const itemExistente = carrinho.find(item => item.produtoId === produtoId);
    
    if (itemExistente) {
        itemExistente.quantidade += 1;
    } else {
        carrinho.push({
            produtoId: produtoId,
            produtoNome: produtoNome,
            produtoPreco: parseFloat(produtoPreco),
            quantidade: 1
        });
    }
    
    localStorage.setItem('carrinho', JSON.stringify(carrinho));
    atualizarCarrinho();
    const btn = event.target;
    const originalText = btn.innerHTML;
    btn.innerHTML = '✓ Adicionado!';
    btn.classList.remove('btn-primary');
    btn.classList.add('btn-success');
    btn.disabled = true;
    
    setTimeout(() => {
        btn.innerHTML = originalText;
        btn.classList.remove('btn-success');
        btn.classList.add('btn-primary');
        btn.disabled = false;
    }, 1500);
}

function atualizarCarrinho() {
    const container = document.getElementById('itensCarrinho');
    const totalContainer = document.getElementById('totalCarrinho');
    const btnFinalizar = document.getElementById('btnFinalizar');
    
    if (!container) return;
    
    if (carrinho.length === 0) {
        container.innerHTML = '<p class="text-muted text-center">Carrinho vazio</p>';
        if (totalContainer) totalContainer.textContent = 'R$ 0,00';
        if (btnFinalizar) btnFinalizar.disabled = true;
        return;
    }
    
    let html = '';
    let total = 0;
    
    carrinho.forEach((item, index) => {
        const subtotal = item.produtoPreco * item.quantidade;
        total += subtotal;
        
        html += `
            <div class="card mb-2 border">
                <div class="card-body py-2">
                    <div class="d-flex justify-content-between align-items-start">
                        <div class="flex-grow-1">
                            <h6 class="mb-1">${item.produtoNome}</h6>
                            <div class="d-flex align-items-center mt-2">
                                <small class="text-muted me-3">R$ ${item.produtoPreco.toFixed(2)}</small>
                                <div class="btn-group btn-group-sm">
                                    <button class="btn btn-outline-secondary" onclick="alterarQuantidade(${index}, -1)">−</button>
                                    <span class="btn btn-light disabled">${item.quantidade}</span>
                                    <button class="btn btn-outline-secondary" onclick="alterarQuantidade(${index}, 1)">+</button>
                                </div>
                            </div>
                        </div>
                        <div class="text-end">
                            <strong class="text-success d-block">R$ ${subtotal.toFixed(2)}</strong>
                            <button class="btn btn-sm btn-outline-danger mt-1" onclick="removerDoCarrinho(${index})" title="Remover">
                                ×
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    if (totalContainer) {
        totalContainer.textContent = `R$ ${total.toFixed(2)}`;
    }
    
    if (btnFinalizar) {
        btnFinalizar.disabled = false;
    }
}

function alterarQuantidade(index, mudanca) {
    if (index < 0 || index >= carrinho.length) return;
    
    const novoValor = carrinho[index].quantidade + mudanca;
    
    if (novoValor <= 0) {
        removerDoCarrinho(index);
    } else {
        carrinho[index].quantidade = novoValor;
        localStorage.setItem('carrinho', JSON.stringify(carrinho));
        atualizarCarrinho();
    }
}


function removerDoCarrinho(index) {
    if (index < 0 || index >= carrinho.length) return;
    
    carrinho.splice(index, 1);
    localStorage.setItem('carrinho', JSON.stringify(carrinho));
    atualizarCarrinho();
}

function finalizarPedido(estabId) {
    if (carrinho.length === 0) {
        alert('Carrinho vazio!');
        return;
    }

    const total = carrinho.reduce((sum, item) => sum + (item.produtoPreco * item.quantidade), 0);
    
    const modalHTML = `
        <div class="modal fade" id="modalFinalizarPedido" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header bg-success text-white">
                        <h5 class="modal-title">🎉 Finalizar Pedido</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row">
                            <div class="col-md-6">
                                <h6>📦 Resumo do Pedido</h6>
                                <div id="resumoPedido" style="max-height: 200px; overflow-y: auto; border: 1px solid #eee; padding: 10px; border-radius: 5px;">
                                    ${carrinho.map(item => `
                                        <div class="d-flex justify-content-between border-bottom pb-2 mb-2">
                                            <div>
                                                <strong>${item.produtoNome}</strong>
                                                <div class="text-muted">Qtd: ${item.quantidade} × R$ ${item.produtoPreco.toFixed(2)}</div>
                                            </div>
                                            <strong>R$ ${(item.quantidade * item.produtoPreco).toFixed(2)}</strong>
                                        </div>
                                    `).join('')}
                                </div>
                                <div class="mt-3 p-2 bg-light rounded">
                                    <div class="d-flex justify-content-between">
                                        <strong>Total:</strong>
                                        <strong class="text-success fs-5">R$ ${total.toFixed(2)}</strong>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <h6>🚚 Informações de Entrega</h6>
                                <div class="mb-3">
                                    <label class="form-label">📍 Endereço de Entrega *</label>
                                    <textarea class="form-control" id="enderecoEntrega" rows="3" placeholder="Digite o endereço completo para entrega">${currentUser.endereco || ''}</textarea>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">📝 Observações (opcional)</label>
                                    <textarea class="form-control" id="observacaoPedido" rows="2" placeholder="Alguma observação especial?"></textarea>
                                </div>
                                <div class="alert alert-info">
                                    <small>
                                        <i class="bi bi-info-circle"></i> 
                                        Seu pedido será enviado para o estabelecimento e você poderá acompanhar o status.
                                    </small>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                        <button type="button" class="btn btn-success" onclick="confirmarPedido(${estabId})">
                            ✅ Confirmar Pedido
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    const modal = new bootstrap.Modal(document.getElementById('modalFinalizarPedido'));
    modal.show();

    document.getElementById('modalFinalizarPedido').addEventListener('hidden.bs.modal', function () {
        this.remove();
    });
}

async function confirmarPedido(estabId) {
    const enderecoEntrega = document.getElementById('enderecoEntrega').value;
    const observacao = document.getElementById('observacaoPedido').value;

    if (!enderecoEntrega.trim()) {
        mostrarAlerta('❌ Por favor, informe o endereço de entrega!', 'danger');
        document.getElementById('enderecoEntrega').focus();
        return;
    }

    const total = carrinho.reduce((sum, item) => sum + (item.produtoPreco * item.quantidade), 0);

    try {
        const pedidoData = {
            estabelecimento_id: estabId,
            itens: carrinho.map(item => ({
                produtoId: item.produtoId,
                quantidade: item.quantidade,
                preco: item.produtoPreco
            })),
            endereco_entrega: enderecoEntrega,
            observacao: observacao
        };
        const btnConfirmar = document.querySelector('#modalFinalizarPedido .btn-success');
        const originalText = btnConfirmar.innerHTML;
        btnConfirmar.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Processando...';
        btnConfirmar.disabled = true;

        const response = await fetch(`${API_URL}/pedidos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(pedidoData)
        });

        const data = await response.json();


        btnConfirmar.innerHTML = originalText;
        btnConfirmar.disabled = false;

        if (response.ok) {
            const modal = bootstrap.Modal.getInstance(document.getElementById('modalFinalizarPedido'));
            modal.hide();
            
            setTimeout(() => {
                mostrarAlertaSucesso(data.pedidoId, data.total);
            }, 300);
     
            carrinho = [];
            localStorage.removeItem('carrinho');
            atualizarCarrinho();
            
       
            setTimeout(() => {
                voltarParaEstabelecimentos();
            }, 3000); 
            
        } else {
            mostrarAlerta('❌ Erro ao fazer pedido: ' + data.error, 'danger');
        }
    } catch (error) {
    
        const btnConfirmar = document.querySelector('#modalFinalizarPedido .btn-success');
        btnConfirmar.innerHTML = '✅ Confirmar Pedido';
        btnConfirmar.disabled = false;
        
        mostrarAlerta('❌ Erro de conexão: ' + error.message, 'danger');
    }
}

function mostrarAlerta(mensagem, tipo = 'info') {
    const alertHTML = `
        <div class="alert alert-${type} alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3" style="z-index: 9999; min-width: 300px;">
            <div class="d-flex align-items-center">
                <div class="flex-grow-1">
                    ${mensagem}
                </div>
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        </div>
    `;
    

    const alertasAntigos = document.querySelectorAll('.alert.position-fixed');
    alertasAntigos.forEach(alerta => alerta.remove());
    
    document.body.insertAdjacentHTML('beforeend', alertHTML);
    setTimeout(() => {
        const alertElement = document.querySelector('.alert.position-fixed');
        if (alertElement) {
            alertElement.remove();
        }
    }, 5000);
}

function mostrarAlertaSucesso(pedidoId, total) {
    const alertHTML = `
        <div class="alert alert-success alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3" style="z-index: 9999; min-width: 400px;">
            <div class="d-flex align-items-center">
                <i class="bi bi-check-circle-fill me-2 fs-4"></i>
                <div class="flex-grow-1">
                    <h6 class="mb-1 fw-bold">🎊 Pedido Confirmado!</h6>
                    <p class="mb-0">Pedido #${pedidoId} • Total: R$ ${parseFloat(total).toFixed(2)}</p>
                    <small class="text-muted">Aguarde o contato do estabelecimento!</small>
                </div>
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        </div>
    `;
    

    const alertasAntigos = document.querySelectorAll('.alert.position-fixed');
    alertasAntigos.forEach(alerta => alerta.remove());
    
    document.body.insertAdjacentHTML('beforeend', alertHTML);
    setTimeout(() => {
        const alertElement = document.querySelector('.alert.position-fixed');
        if (alertElement) {
            alertElement.remove();
        }
    }, 5000);
}


async function verDetalhesPedido(pedidoId) {
    try {
        const response = await fetch(`${API_URL}/pedidos/${pedidoId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const pedido = await response.json();
        
        let itensHTML = '';
        pedido.itens.forEach(item => {
            itensHTML += `
                <div class="d-flex justify-content-between border-bottom pb-2 mb-2">
                    <div>
                        <strong>${item.produto_nome}</strong>
                        <div class="text-muted">Qtd: ${item.quantidade} × R$ ${parseFloat(item.preco_unitario).toFixed(2)}</div>
                    </div>
                    <strong>R$ ${(item.quantidade * item.preco_unitario).toFixed(2)}</strong>
                </div>
            `;
        });

        const statusInfo = getStatusInfo(pedido.status);
        const modalHTML = `
            <div class="modal fade" id="modalPedido" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Pedido #${pedido.id}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <strong>Estabelecimento:</strong><br>
                                    ${pedido.estabelecimento_nome}
                                </div>
                                <div class="col-md-6">
                                    <strong>Status:</strong><br>
                                    <span class="badge ${statusInfo.class}">${statusInfo.text}</span>
                                </div>
                            </div>
                            <div class="row mb-3">
                                <div class="col-12">
                                    <strong>Endereço de Entrega:</strong><br>
                                    ${pedido.endereco_entrega}
                                </div>
                            </div>
                            ${pedido.observacao ? `
                            <div class="row mb-3">
                                <div class="col-12">
                                    <strong>Observações:</strong><br>
                                    ${pedido.observacao}
                                </div>
                            </div>
                            ` : ''}
                            <div class="row">
                                <div class="col-12">
                                    <h6>Itens do Pedido:</h6>
                                    ${itensHTML}
                                    <div class="d-flex justify-content-between mt-3 pt-2 border-top">
                                        <strong>Total:</strong>
                                        <strong class="text-success">R$ ${parseFloat(pedido.total).toFixed(2)}</strong>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fechar</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        const modal = new bootstrap.Modal(document.getElementById('modalPedido'));
        modal.show();
        
        document.getElementById('modalPedido').addEventListener('hidden.bs.modal', function () {
            this.remove();
        });

    } catch (error) {
        console.error('Erro ao carregar detalhes do pedido:', error);
        alert('Erro ao carregar detalhes do pedido');
    }
}



async function loadMeusEstabelecimentos() {
    document.getElementById('meusEstabelecimentos').innerHTML = '<p>Carregando...</p>';
    
    try {
        const response = await fetch(`${API_URL}/estabelecimentos/meus`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const estabelecimentos = await response.json();
            const container = document.getElementById('meusEstabelecimentos');
            container.innerHTML = '';
            
            if (estabelecimentos.length === 0) {
                container.innerHTML = `
                    <div class="alert alert-info">
                        Você ainda não cadastrou nenhum estabelecimento.
                        <button class="btn btn-primary mt-2" onclick="showCadastroEstabelecimento()">Cadastrar Primeiro Estabelecimento</button>
                    </div>
                `;
                return;
            }
            
            estabelecimentos.forEach(estab => {
                const card = document.createElement('div');
                card.className = 'card mb-3';
                card.innerHTML = `
                    <div class="card-body">
                        <h5 class="card-title">${estab.nome}</h5>
                        <p class="card-text">${estab.descricao || 'Sem descrição'}</p>
                        <span class="badge ${estab.aprovado ? 'bg-success' : 'bg-warning'}">
                            ${estab.aprovado ? 'Aprovado' : 'Aguardando Aprovação'}
                        </span>
                        <div class="mt-2">
                            <button class="btn btn-primary btn-sm" onclick="gerenciarCardapio(${estab.id})">
                                Gerenciar Cardápio
                            </button>
                            <button class="btn btn-info btn-sm" onclick="verPedidos(${estab.id})">
                                Ver Pedidos
                            </button>
                        </div>
                    </div>
                `;
                container.appendChild(card);
            });
        }
    } catch (error) {
        console.error('Erro ao carregar estabelecimentos:', error);
        document.getElementById('meusEstabelecimentos').innerHTML = '<p class="text-danger">Erro ao carregar estabelecimentos</p>';
    }
}

function showCadastroEstabelecimento() {
    const container = document.getElementById('meusEstabelecimentos');
    container.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h5>Cadastrar Estabelecimento</h5>
            </div>
            <div class="card-body">
                <form id="formEstabelecimento">
                    <div class="mb-3">
                        <label class="form-label">Nome do Estabelecimento</label>
                        <input type="text" class="form-control" id="estabNome" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Descrição</label>
                        <textarea class="form-control" id="estabDescricao" rows="3"></textarea>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Categoria</label>
                        <input type="text" class="form-control" id="estabCategoria" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Endereço</label>
                        <textarea class="form-control" id="estabEndereco" required></textarea>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Telefone</label>
                        <input type="text" class="form-control" id="estabTelefone">
                    </div>
                    <div class="mb-3">
                        <label class="form-label">CNPJ</label>
                        <input type="text" class="form-control" id="estabCnpj">
                    </div>
                    <button type="button" class="btn btn-success" onclick="cadastrarEstabelecimento()">
                        Cadastrar
                    </button>
                    <button type="button" class="btn btn-secondary" onclick="loadMeusEstabelecimentos()">
                        Cancelar
                    </button>
                </form>
            </div>
        </div>
    `;
}

async function cadastrarEstabelecimento() {
    const estabelecimentoData = {
        nome: document.getElementById('estabNome').value,
        descricao: document.getElementById('estabDescricao').value,
        categoria: document.getElementById('estabCategoria').value,
        endereco: document.getElementById('estabEndereco').value,
        telefone: document.getElementById('estabTelefone').value,
        cnpj: document.getElementById('estabCnpj').value
    };

    try {
        const response = await fetch(`${API_URL}/estabelecimentos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(estabelecimentoData)
        });

        const data = await response.json();

        if (response.ok) {
            alert('Estabelecimento cadastrado! Aguardando aprovação do administrador.');
            loadMeusEstabelecimentos();
        } else {
            alert(data.error);
        }
    } catch (error) {
        alert('Erro ao cadastrar estabelecimento: ' + error.message);
    }
}

function gerenciarCardapio(estabId) {
    const container = document.getElementById('meusEstabelecimentos');
    container.innerHTML = `
        <div class="card">
            <div class="card-header d-flex justify-content-between align-items-center">
                <h5>Gerenciar Cardápio</h5>
                <button class="btn btn-primary btn-sm" onclick="showAdicionarProduto(${estabId})">
                    + Adicionar Produto
                </button>
            </div>
            <div class="card-body">
                <div id="listaProdutos-${estabId}">
                    <p>Carregando produtos...</p>
                </div>
                <div class="mt-3">
                    <button class="btn btn-secondary" onclick="loadMeusEstabelecimentos()">
                        ← Voltar
                    </button>
                </div>
            </div>
        </div>
    `;
    
    loadProdutos(estabId);
}


async function loadProdutos(estabId) {
    try {
        const response = await fetch(`${API_URL}/estabelecimentos/${estabId}/produtos`);
        const produtos = await response.json();
        
        const container = document.getElementById(`listaProdutos-${estabId}`);
        
        if (produtos.length === 0) {
            container.innerHTML = `
                <div class="alert alert-info">
                    Nenhum produto cadastrado ainda.
                    <button class="btn btn-primary mt-2" onclick="showAdicionarProduto(${estabId})">
                        Adicionar Primeiro Produto
                    </button>
                </div>
            `;
            return;
        }
        
        const produtosPorCategoria = {};
        produtos.forEach(produto => {
            if (!produtosPorCategoria[produto.categoria]) {
                produtosPorCategoria[produto.categoria] = [];
            }
            produtosPorCategoria[produto.categoria].push(produto);
        });
        
        let html = '';
        for (const [categoria, produtosCategoria] of Object.entries(produtosPorCategoria)) {
            html += `
                <div class="mb-4">
                    <h6 class="border-bottom pb-2">${categoria || 'Sem Categoria'}</h6>
                    <div class="row">
            `;
            
            produtosCategoria.forEach(produto => {
                html += `
                    <div class="col-md-6 mb-3">
                        <div class="card">
                            <div class="card-body">
                                <div class="d-flex justify-content-between">
                                    <div>
                                        <h6 class="card-title">${produto.nome}</h6>
                                        <p class="card-text small text-muted">${produto.descricao || 'Sem descrição'}</p>
                                    </div>
                                    <div class="text-end">
                                        <strong class="text-success">R$ ${parseFloat(produto.preco).toFixed(2)}</strong>
                                    </div>
                                </div>
                                <div class="mt-2">
                                    <button class="btn btn-warning btn-sm" onclick="editarProduto(${produto.id}, ${estabId})">
                                        Editar
                                    </button>
                                    <button class="btn btn-danger btn-sm" onclick="deletarProduto(${produto.id}, ${estabId})">
                                        Excluir
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        }
        
        container.innerHTML = html;
    } catch (error) {
        console.error('Erro ao carregar produtos:', error);
        document.getElementById(`listaProdutos-${estabId}`).innerHTML = '<p class="text-danger">Erro ao carregar produtos</p>';
    }
}


function showAdicionarProduto(estabId) {
    const container = document.getElementById(`listaProdutos-${estabId}`);
    container.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h6>Adicionar Novo Produto</h6>
            </div>
            <div class="card-body">
                <form id="formProduto-${estabId}">
                    <div class="row">
                        <div class="col-md-6">
                            <div class="mb-3">
                                <label class="form-label">Nome do Produto *</label>
                                <input type="text" class="form-control" id="produtoNome-${estabId}" required>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="mb-3">
                                <label class="form-label">Preço (R$) *</label>
                                <input type="number" class="form-control" id="produtoPreco-${estabId}" step="0.01" min="0" required>
                            </div>
                        </div>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Categoria</label>
                        <input type="text" class="form-control" id="produtoCategoria-${estabId}" placeholder="Ex: Bebidas, Lanches, Sobremesas">
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Descrição</label>
                        <textarea class="form-control" id="produtoDescricao-${estabId}" rows="3" placeholder="Descreva o produto..."></textarea>
                    </div>
                    <div class="d-flex gap-2">
                        <button type="button" class="btn btn-success" onclick="adicionarProduto(${estabId})">
                            Adicionar Produto
                        </button>
                        <button type="button" class="btn btn-secondary" onclick="loadProdutos(${estabId})">
                            Cancelar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
}


async function adicionarProduto(estabId) {
    const produtoData = {
        nome: document.getElementById(`produtoNome-${estabId}`).value,
        preco: parseFloat(document.getElementById(`produtoPreco-${estabId}`).value),
        categoria: document.getElementById(`produtoCategoria-${estabId}`).value,
        descricao: document.getElementById(`produtoDescricao-${estabId}`).value
    };

    try {
        const response = await fetch(`${API_URL}/estabelecimentos/${estabId}/produtos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(produtoData)
        });

        const data = await response.json();

        if (response.ok) {
            alert('Produto adicionado com sucesso!');
            loadProdutos(estabId);
        } else {
            alert(data.error);
        }
    } catch (error) {
        alert('Erro ao adicionar produto: ' + error.message);
    }
}


function verPedidos(estabId) {
    const container = document.getElementById('meusEstabelecimentos');
    container.innerHTML = `
        <div class="card">
            <div class="card-header d-flex justify-content-between align-items-center">
                <h5>📦 Pedidos do Estabelecimento</h5>
                <button class="btn btn-secondary btn-sm" onclick="loadMeusEstabelecimentos()">
                    ← Voltar
                </button>
            </div>
            <div class="card-body">
                <div id="listaPedidosEmpresa-${estabId}">
                    <p>Carregando pedidos...</p>
                </div>
            </div>
        </div>
    `;
    
    carregarPedidosEmpresa(estabId);
}

async function carregarPedidosEmpresa(estabId) {
    try {
        const response = await fetch(`${API_URL}/estabelecimentos/${estabId}/pedidos`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const pedidos = await response.json();
        const container = document.getElementById(`listaPedidosEmpresa-${estabId}`);

        if (pedidos.length === 0) {
            container.innerHTML = `
                <div class="alert alert-info">
                    <h6>📭 Nenhum pedido recebido</h6>
                    <p class="mb-0">Aguardando novos pedidos dos clientes.</p>
                </div>
            `;
            return;
        }

        let html = '';
        pedidos.forEach(pedido => {
            const data = new Date(pedido.data_pedido).toLocaleString('pt-BR');
            const statusInfo = getStatusInfo(pedido.status);
            
            html += `
                <div class="card mb-3">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <div>
                            <strong>Pedido #${pedido.id}</strong>
                            <small class="text-muted ms-2">${data}</small>
                        </div>
                        <span class="badge ${statusInfo.class}">${statusInfo.text}</span>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-6">
                                <h6>Cliente: ${pedido.cliente_nome}</h6>
                                <p class="mb-1"><strong>Telefone:</strong> ${pedido.cliente_telefone || 'Não informado'}</p>
                                <p class="mb-1"><strong>Total:</strong> R$ ${parseFloat(pedido.total).toFixed(2)}</p>
                                <p class="mb-0"><strong>Endereço:</strong> ${pedido.endereco_entrega}</p>
                            </div>
                            <div class="col-md-6">
                                <div class="d-flex flex-column gap-2">
                                    <strong>Atualizar Status:</strong>
                                    <select class="form-select" id="statusPedido-${pedido.id}" onchange="atualizarStatusPedido(${pedido.id}, ${estabId})">
                                        <option value="pendente" ${pedido.status === 'pendente' ? 'selected' : ''}>⏳ Pendente</option>
                                        <option value="confirmado" ${pedido.status === 'confirmado' ? 'selected' : ''}>✅ Confirmado</option>
                                        <option value="preparando" ${pedido.status === 'preparando' ? 'selected' : ''}>👨‍🍳 Preparando</option>
                                        <option value="pronto" ${pedido.status === 'pronto' ? 'selected' : ''}>🎉 Pronto</option>
                                        <option value="entregue" ${pedido.status === 'entregue' ? 'selected' : ''}>🚀 Entregue</option>
                                        <option value="cancelado" ${pedido.status === 'cancelado' ? 'selected' : ''}>❌ Cancelado</option>
                                    </select>
                                    <button class="btn btn-info btn-sm" onclick="verDetalhesPedidoEmpresa(${pedido.id}, ${estabId})">
                                        Ver Detalhes
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    } catch (error) {
        console.error('Erro ao carregar pedidos da empresa:', error);
        document.getElementById(`listaPedidosEmpresa-${estabId}`).innerHTML = `
            <div class="alert alert-danger">
                Erro ao carregar pedidos. Tente novamente.
            </div>
        `;
    }
}

async function atualizarStatusPedido(pedidoId, estabId) {
    const novoStatus = document.getElementById(`statusPedido-${pedidoId}`).value;
    
    try {
        const response = await fetch(`${API_URL}/pedidos/${pedidoId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status: novoStatus })
        });

        const data = await response.json();

        if (response.ok) {
      
            const statusInfo = getStatusInfo(novoStatus);
            const badge = document.querySelector(`#statusPedido-${pedidoId}`).closest('.card').querySelector('.badge');
            badge.className = `badge ${statusInfo.class}`;
            badge.textContent = statusInfo.text;
            
            const select = document.getElementById(`statusPedido-${pedidoId}`);
            const originalColor = select.style.backgroundColor;
            select.style.backgroundColor = '#d4edda';
            
            setTimeout(() => {
                select.style.backgroundColor = originalColor;
            }, 1000);
        } else {
            alert('Erro ao atualizar status: ' + data.error);
            carregarPedidosEmpresa(estabId);
        }
    } catch (error) {
        alert('Erro ao atualizar status: ' + error.message);
        carregarPedidosEmpresa(estabId);
    }
}


async function verDetalhesPedidoEmpresa(pedidoId, estabId) {
    await verDetalhesPedido(pedidoId);
}



async function loadEmpresasPendentes() {
    try {
        const response = await fetch(`${API_URL}/admin/empresas-pendentes`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const empresas = await response.json();
            const container = document.getElementById('empresasPendentes');
            container.innerHTML = '';
            
            if (empresas.length === 0) {
                container.innerHTML = '<p class="text-muted">Nenhuma empresa pendente de aprovação.</p>';
                return;
            }
            
            empresas.forEach(empresa => {
                const card = document.createElement('div');
                card.className = 'card mb-3';
                card.innerHTML = `
                    <div class="card-body">
                        <h6>${empresa.nome}</h6>
                        <p><small>CNPJ: ${empresa.cnpj || 'Não informado'}</small></p>
                        <p>${empresa.descricao || 'Sem descrição'}</p>
                        <div>
                            <button class="btn btn-success btn-sm" onclick="aprovarEmpresa(${empresa.id})">
                                Aprovar
                            </button>
                            <button class="btn btn-danger btn-sm" onclick="rejeitarEmpresa(${empresa.id})">
                                Rejeitar
                            </button>
                        </div>
                    </div>
                `;
                container.appendChild(card);
            });
        }
    } catch (error) {
        console.error('Erro ao carregar empresas pendentes:', error);
        document.getElementById('empresasPendentes').innerHTML = '<p class="text-danger">Erro ao carregar empresas pendentes</p>';
    }
}

async function loadUsuarios() {
    try {
        const response = await fetch(`${API_URL}/admin/usuarios`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const usuarios = await response.json();
            const container = document.getElementById('listaUsuarios');
            container.innerHTML = '';
            
            if (usuarios.length === 0) {
                container.innerHTML = '<p class="text-muted">Nenhum usuário cadastrado.</p>';
                return;
            }
            
            usuarios.forEach(usuario => {
                const card = document.createElement('div');
                card.className = 'card mb-2';
                card.innerHTML = `
                    <div class="card-body py-2">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h6 class="mb-0">${usuario.nome}</h6>
                                <small class="text-muted">${usuario.email} • ${usuario.tipo}</small>
                            </div>
                            <button class="btn ${usuario.ativo ? 'btn-warning' : 'btn-success'} btn-sm" 
                                    onclick="toggleUsuario(${usuario.id}, ${!usuario.ativo})">
                                ${usuario.ativo ? 'Bloquear' : 'Ativar'}
                            </button>
                        </div>
                    </div>
                `;
                container.appendChild(card);
            });
        }
    } catch (error) {
        console.error('Erro ao carregar usuários:', error);
        document.getElementById('listaUsuarios').innerHTML = '<p class="text-danger">Erro ao carregar usuários</p>';
    }
}

async function aprovarEmpresa(empresaId) {
    if (confirm('Deseja aprovar esta empresa?')) {
        try {
            const response = await fetch(`${API_URL}/admin/empresas/${empresaId}/aprovar`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                alert('Empresa aprovada com sucesso!');
                loadEmpresasPendentes();
            } else {
                alert('Erro ao aprovar empresa');
            }
        } catch (error) {
            alert('Erro ao aprovar empresa: ' + error.message);
        }
    }
}

async function rejeitarEmpresa(empresaId) {
    if (confirm('Deseja rejeitar esta empresa?')) {
        try {
            const response = await fetch(`${API_URL}/admin/empresas/${empresaId}/rejeitar`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                alert('Empresa rejeitada com sucesso!');
                loadEmpresasPendentes();
            } else {
                alert('Erro ao rejeitar empresa');
            }
        } catch (error) {
            alert('Erro ao rejeitar empresa: ' + error.message);
        }
    }
}

async function toggleUsuario(usuarioId, novoStatus) {
    const acao = novoStatus ? 'ativar' : 'bloquear';
    if (confirm(`Deseja ${acao} este usuário?`)) {
        try {
            const response = await fetch(`${API_URL}/admin/usuarios/${usuarioId}/toggle`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ ativo: novoStatus })
            });
            
            if (response.ok) {
                alert(`Usuário ${acao}do com sucesso!`);
                loadUsuarios();
            } else {
                alert('Erro ao atualizar usuário');
            }
        } catch (error) {
            alert('Erro ao atualizar usuário: ' + error.message);
        }
    }
}


function getStatusInfo(status) {
    const statusMap = {
        'pendente': { class: 'bg-secondary', text: '⏳ Pendente' },
        'confirmado': { class: 'bg-primary', text: '✅ Confirmado' },
        'preparando': { class: 'bg-warning', text: '👨‍🍳 Preparando' },
        'pronto': { class: 'bg-info', text: '🎉 Pronto' },
        'entregue': { class: 'bg-success', text: '🚀 Entregue' },
        'cancelado': { class: 'bg-danger', text: '❌ Cancelado' }
    };
    return statusMap[status] || { class: 'bg-secondary', text: status };
}

// Funções placeholder
function editarProduto(produtoId, estabId) {
    alert(`Editar produto ${produtoId} - Em desenvolvimento`);
}

function deletarProduto(produtoId, estabId) {
    if (confirm('Tem certeza que deseja excluir este produto?')) {
        alert(`Excluir produto ${produtoId} - Em desenvolvimento`);
    }
}