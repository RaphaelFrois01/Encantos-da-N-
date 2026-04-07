// --- Configurações do Banco de Dados ---
const SB_URL = 'https://dxfblhrsxknbhfwncalx.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4ZmJsaHJzeGtuYmhmd25jYWx4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1NjE3NDYsImV4cCI6MjA5MTEzNzc0Nn0.vPBsZuE2_rkm5QmgRvJ6IUwS_I7GgehoXGg4yCzqu5Y';
const MASTER_ADMIN = 'jenifferpradot@gmail.com';

// Variável de conexão com nome ultra-único para evitar conflitos
let sb_engine;

// --- Gestão de Estado ---
class AppState {
    constructor() {
        this.user = null;
        this.role = null;
        this.pieces = [];
        this.clients = [];
        this.orders = [];
        this.currentView = 'dashboard';
        this.authMode = 'login';
    }

    async init() {
        this.setLoading(true);
        try {
            // Verifica se a biblioteca foi carregada corretamente pelo index.html
            if (typeof window.supabase === 'undefined') throw new Error("Biblioteca de conexão não encontrada.");
            
            // Inicializa a conexão usando o motor global
            sb_engine = window.supabase.createClient(SB_URL, SB_KEY);

            const { data: { session }, error } = await sb_engine.auth.getSession();
            if (error) throw error;
            
            await this.handleAuthStateChange(session);

            sb_engine.auth.onAuthStateChange(async (_event, session) => {
                await this.handleAuthStateChange(session);
            });
        } catch (err) {
            console.error("Erro na inicialização:", err);
            UI.showScreen('auth-screen');
        } finally {
            this.setLoading(false);
        }
    }

    async handleAuthStateChange(session) {
        if (session) {
            this.user = session.user;
            this.role = (this.user.email === MASTER_ADMIN) ? 'admin' : 'cliente';
            
            try {
                await sb_engine.from('profiles').upsert({
                    id: this.user.id,
                    role: this.role,
                    full_name: this.user.user_metadata.full_name || 'Usuário'
                });
            } catch (e) { console.warn("Erro ao salvar perfil"); }

            UI.showScreen('app-screen');
            await this.loadData();
            UI.renderAppNav();
            UI.renderView('dashboard');
        } else {
            this.user = null;
            this.role = null;
            UI.showScreen('auth-screen');
            UI.renderAuthUI();
        }
    }

    async loadData() {
        if (!this.user) return;
        this.setLoading(true);
        try {
            const [pRes, cRes, oRes] = await Promise.all([
                sb_engine.from('pecas').select('*').order('created_at', { ascending: false }),
                sb_engine.from('clientes').select('*').order('nome'),
                sb_engine.from('pedidos').select('*').order('data', { ascending: false })
            ]);
            this.pieces = pRes.data || [];
            this.clients = cRes.data || [];
            this.orders = oRes.data || [];
        } catch (err) { console.error("Erro ao carregar dados:", err); }
        this.setLoading(false);
    }

    setLoading(val) {
        const loader = document.getElementById('loading-overlay');
        if (loader) val ? loader.classList.remove('hidden') : loader.classList.add('hidden');
    }
}

const state = new AppState();

// --- Interface do Usuário (UI) ---
const UI = {
    init() {
        this.setupAuthListeners();
        this.setupGeneralListeners();
        state.init();
    },

    setupAuthListeners() {
        const form = document.getElementById('auth-form');
        if (form) {
            form.onsubmit = async (e) => {
                e.preventDefault();
                const email = document.getElementById('user-email').value.trim();
                const password = document.getElementById('user-password').value;
                state.setLoading(true);
                try {
                    if (state.authMode === 'login') {
                        const { error } = await sb_engine.auth.signInWithPassword({ email, password });
                        if (error) throw error;
                    } else if (state.authMode === 'signup') {
                        const fullName = document.getElementById('user-fullname').value.trim();
                        const { error } = await sb_engine.auth.signUp({ 
                            email, password, options: { data: { full_name: fullName } } 
                        });
                        if (error) throw error;
                        alert("Verifique seu e-mail para confirmar a conta!");
                    }
                } catch (err) { alert("Ops! " + err.message); }
                state.setLoading(false);
            };
        }

        const toggleBtn = document.getElementById('toggle-auth');
        if (toggleBtn) {
            toggleBtn.onclick = (e) => {
                e.preventDefault();
                state.authMode = (state.authMode === 'login') ? 'signup' : 'login';
                this.renderAuthUI();
            };
        }
        
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) logoutBtn.onclick = () => sb_engine.auth.signOut();
    },

    renderAuthUI() {
        const title = document.getElementById('auth-title');
        const submitBtn = document.getElementById('auth-submit-btn');
        const toggleBtn = document.getElementById('toggle-auth');
        const nameGroup = document.getElementById('name-group');

        if (state.authMode === 'signup') {
            title.innerText = "Criar Conta";
            submitBtn.innerText = "Cadastrar";
            toggleBtn.innerText = "Já tem conta? Entre aqui";
            nameGroup.classList.remove('hidden');
        } else {
            title.innerText = "Encantos da Nê";
            submitBtn.innerText = "Entrar";
            toggleBtn.innerText = "Cadastrar nova conta";
            nameGroup.classList.add('hidden');
        }
    },

    setupGeneralListeners() {
        const closeMod = document.getElementById('close-modal');
        if (closeMod) closeMod.onclick = () => this.toggleModal(false);
    },

    showScreen(id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
        const screen = document.getElementById(id);
        if (screen) screen.classList.remove('hidden');
    },

    renderAppNav() {
        const container = document.getElementById('nav-container');
        if (!container) return;
        container.innerHTML = `
            <button class="nav-btn" data-view="dashboard"><i data-lucide="layout-dashboard"></i><span>Início</span></button>
            <button class="nav-btn" data-view="pieces"><i data-lucide="package"></i><span>Estoque</span></button>
            <button class="nav-btn" data-view="clients"><i data-lucide="users"></i><span>Clientes</span></button>
            <button class="nav-btn" data-view="orders"><i data-lucide="shopping-cart"></i><span>Pedidos</span></button>
        `;
        if (window.lucide) lucide.createIcons();

        container.querySelectorAll('.nav-btn').forEach(btn => {
            btn.onclick = () => {
                this.renderView(btn.dataset.view);
                container.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            };
        });
    },

    renderView(view) {
        const content = document.getElementById('main-content');
        if (!content) return;
        content.innerHTML = '';
        state.currentView = view;

        switch (view) {
            case 'dashboard': this.renderDashboard(); break;
            case 'pieces': this.renderPieces(); break;
            case 'clients': this.renderClients(); break;
            case 'orders': this.renderOrders(); break;
        }
        if (window.lucide) lucide.createIcons();
    },

    renderDashboard() {
        const totalSales = state.orders.reduce((sum, o) => sum + Number(o.total || 0), 0);
        document.getElementById('main-content').innerHTML = `
            <div class="view-header"><h1>Olá, Jeniffer! 🧶</h1></div>
            <div class="grid">
                <div class="card"><small>Vendas Registradas</small><h3>R$ ${totalSales.toFixed(2).replace('.', ',')}</h3></div>
                <div class="card"><small>Produtos no Estoque</small><h3>${state.pieces.length}</h3></div>
                <div class="card"><small>Sua Base de Clientes</small><h3>${state.clients.length}</h3></div>
            </div>
            <div class="card" style="margin-top:24px; background: linear-gradient(135deg, var(--bg-card), #fff5f8);">
                <h3 style="color:var(--primary)">Dica do Dia</h3>
                <p>Mantenha seu estoque sempre atualizado para calcular os preços com precisão!</p>
            </div>
        `;
    },

    renderPieces() {
        const content = document.getElementById('main-content');
        content.innerHTML = `
            <div class="view-header">
                <h1>Meu Estoque</h1>
                <button class="btn btn-primary" id="add-piece-btn"><i data-lucide="plus"></i> Novo Produto</button>
            </div>
            <div class="grid">
                ${state.pieces.map(p => `
                    <div class="card">
                        <h3 style="margin-bottom:4px">${p.nome}</h3>
                        <p style="color:#777; font-size:0.85em; margin-bottom:12px;">${p.linha || 'Sem descrição'}</p>
                        <div style="background: rgba(0,0,0,0.03); padding: 10px; border-radius: 8px;">
                            <div style="display:flex; justify-content:space-between; font-size: 0.9em; margin-bottom: 5px;">
                                <span>Tempo gasto:</span> 
                                <strong>${p.tempo_trabalho || 0}h</strong>
                            </div>
                            <hr style="border:none; border-top:1px solid #eee; margin: 8px 0;">
                            <div style="display:flex; justify-content:space-between; color: var(--primary); font-weight:bold;">
                                <span>Preço Unitário:</span> 
                                <span>R$ ${Number(p.preco_final || 0).toFixed(2).replace('.', ',')}</span>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        document.getElementById('add-piece-btn').onclick = () => this.showPieceModal();
    },

    showPieceModal() {
        const html = `
            <form id="piece-form">
                <div style="margin-bottom: 24px;">
                    <h3 style="margin-bottom: 12px; color: var(--primary)">📝 Dados do Produto</h3>
                    <div class="form-group">
                        <label>O que você produziu?</label>
                        <input type="text" id="p-nome" required placeholder="Ex: Jogo de Banheiro 3 pçs">
                    </div>
                    <div class="form-group">
                        <label>Descrição ou Materiais</label>
                        <input type="text" id="p-linha" placeholder="Ex: Barbante Fio 6 Rosa">
                    </div>
                </div>

                <div style="margin-bottom: 24px;">
                    <h3 style="margin-bottom: 15px; color: var(--primary)">💰 Calculadora de Preço</h3>
                    
                    <div style="background: rgba(0,0,0,0.02); padding:15px; border-radius:8px; margin-bottom:12px; border: 1px solid #eee;">
                        <h4 style="margin-bottom:10px; font-size:1rem;">1. Custo dos Materiais</h4>
                        <div class="form-group">
                            <label>Valor total gasto em material (R$)</label>
                            <input type="number" step="0.01" id="p-materiais" placeholder="0.00" required>
                        </div>
                    </div>

                    <div style="background: rgba(0,0,0,0.02); padding:15px; border-radius:8px; margin-bottom:12px; border: 1px solid #eee;">
                        <h4 style="margin-bottom:10px; font-size:1rem;">2. Mão de Obra</h4>
                        <div class="grid" style="gap:10px">
                            <div class="form-group">
                                <label>Horas trabalhadas</label>
                                <input type="number" step="0.5" id="p-horas" placeholder="0.0" required>
                            </div>
                            <div class="form-group">
                                <label>Valor da sua hora (R$)</label>
                                <input type="number" step="0.01" id="p-valor-hora" value="10.00" required>
                            </div>
                        </div>
                    </div>

                    <div style="background: rgba(0,0,0,0.02); padding:15px; border-radius:8px; border: 1px solid #eee;">
                        <h4 style="margin-bottom:10px; font-size:1rem;">3. Lucro Bruto</h4>
                        <div class="form-group" style="margin-bottom:0;">
                            <label>% de Lucro desejada (Sobre o custo)</label>
                            <input type="number" step="1" id="p-lucro-pct" value="20" required>
                        </div>
                    </div>
                </div>

                <div style="background: #fdf2f5; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 2px solid var(--primary-light);">
                    <h3 style="margin-bottom: 15px; color: var(--primary)">Resumo da Precificação</h3>
                    <div style="display:flex; justify-content:space-between; margin-bottom:8px">
                        <span>Custo Materiais</span> <span id="res-mat">R$ 0,00</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:8px">
                        <span>Custo Trabalho</span> <span id="res-trab">R$ 0,00</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:12px">
                        <span>Margem de Lucro</span> <span id="res-luc">R$ 0,00</span>
                    </div>
                    <hr style="border:none; border-top:2px dashed #ffc0d3; margin: 10px 0;">
                    <div style="display:flex; justify-content:space-between; font-weight:bold; font-size:1.4rem; color:var(--primary); margin-top:10px;">
                        <span>Preço Sugerido</span> <span id="res-total">R$ 0,00</span>
                    </div>
                </div>

                <button type="submit" class="btn btn-primary" style="width:100%; padding: 16px; font-weight:bold;">SALVAR PRODUTO</button>
            </form>
        `;
        this.toggleModal(true, "Nova Precificação", html);

        let finalPrice = 0;
        const updateCalc = () => {
            const mat = Number(document.getElementById('p-materiais').value) || 0;
            const hrs = Number(document.getElementById('p-horas').value) || 0;
            const vHr = Number(document.getElementById('p-valor-hora').value) || 0;
            const pct = Number(document.getElementById('p-lucro-pct').value) || 0;

            const workValue = hrs * vHr;
            const baseCost = mat + workValue;
            const profitValue = baseCost * (pct / 100);
            finalPrice = baseCost + profitValue;

            document.getElementById('res-mat').innerText = `R$ ${mat.toFixed(2).replace('.', ',')}`;
            document.getElementById('res-trab').innerText = `R$ ${workValue.toFixed(2).replace('.', ',')}`;
            document.getElementById('res-luc').innerText = `R$ ${profitValue.toFixed(2).replace('.', ',')}`;
            document.getElementById('res-total').innerText = `R$ ${finalPrice.toFixed(2).replace('.', ',')}`;
        };

        const inputs = ['p-materiais', 'p-horas', 'p-valor-hora', 'p-lucro-pct'];
        inputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.oninput = updateCalc;
        });

        document.getElementById('piece-form').onsubmit = async (e) => {
            e.preventDefault();
            const data = {
                nome: document.getElementById('p-nome').value,
                linha: document.getElementById('p-linha').value,
                peso: 0,
                tempo_trabalho: Number(document.getElementById('p-horas').value),
                preco_final: finalPrice,
                user_id: state.user.id
            };

            state.setLoading(true);
            const { error } = await sb_engine.from('pecas').insert(data);
            if (error) alert("Erro Supabase: " + error.message);
            else {
                this.toggleModal(false);
                await state.loadData();
                this.renderPieces();
            }
            state.setLoading(false);
        };
    },

    renderClients() {
        const content = document.getElementById('main-content');
        content.innerHTML = `
            <div class="view-header">
                <h1>Meus Clientes</h1>
                <button class="btn btn-primary" id="add-client-btn"><i data-lucide="plus"></i> Novo Cliente</button>
            </div>
            <div class="grid">
                ${state.clients.length === 0 ? '<div class="card"><p>Nenhum cliente cadastrado ainda.</p></div>' : 
                  state.clients.map(c => `
                    <div class="card">
                        <h3>${c.nome}</h3>
                        <p><small>📱 WhatsApp: ${c.whatsapp || 'N/A'}</small></p>
                        <p style="font-size: 0.8em; color: #666; margin-top:5px;">📍 ${c.endereco || 'Endereço não informado'}</p>
                    </div>
                `).join('')}
            </div>
        `;
        const btn = document.getElementById('add-client-btn');
        if (btn) btn.onclick = () => this.showClientModal();
    },

    showClientModal() {
        const html = `
            <form id="client-form">
                <div class="form-group">
                    <label>Nome do Cliente</label>
                    <input type="text" id="c-nome" required placeholder="Ex: Maria Souza">
                </div>
                <div class="form-group">
                    <label>WhatsApp</label>
                    <input type="text" id="c-whatsapp" placeholder="(00) 00000-0000">
                </div>
                <div class="form-group">
                    <label>Endereço / Referência</label>
                    <input type="text" id="c-endereco" placeholder="Rua, Número, Bairro">
                </div>
                <button type="submit" class="btn btn-primary" style="width:100%; padding:15px;">SALVAR CLIENTE</button>
            </form>
        `;
        this.toggleModal(true, "Cadastrar Cliente", html);

        document.getElementById('client-form').onsubmit = async (e) => {
            e.preventDefault();
            const data = {
                nome: document.getElementById('c-nome').value,
                whatsapp: document.getElementById('c-whatsapp').value,
                endereco: document.getElementById('c-endereco').value,
                user_id: state.user.id
            };

            state.setLoading(true);
            const { error } = await sb_engine.from('clientes').insert(data);
            if (error) alert(error.message);
            else {
                this.toggleModal(false);
                await state.loadData();
                this.renderClients();
            }
            state.setLoading(false);
        };
    },

    renderOrders() {
        document.getElementById('main-content').innerHTML = `
            <div class="view-header"><h1>Meus Pedidos</h1></div>
            <div class="card">
                <p>Esta função está sendo preparada para você vincular seus Produtos aos Clientes.</p>
            </div>
        `;
    },

    toggleModal(show, title = '', contentHtml = '') {
        const modal = document.getElementById('modal-container');
        if (!modal) return;
        if (show) {
            document.getElementById('modal-title').innerText = title;
            document.getElementById('modal-body').innerHTML = contentHtml;
            modal.classList.remove('hidden');
            setTimeout(() => modal.classList.add('active'), 10);
            if (window.lucide) lucide.createIcons();
        } else {
            modal.classList.remove('active');
            setTimeout(() => modal.classList.add('hidden'), 300);
        }
    }
};

try {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => UI.init());
    else UI.init();
} catch (e) {
    console.error("Critical error in UI init:", e);
}
