// --- Configurações do Supabase ---
const SUPABASE_URL = 'https://dxfblhrsxknbhfwncalx.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4ZmJsaHJzeGtuYmhmd25jYWx4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1NjE3NDYsImV4cCI6MjA5MTEzNzc0Nn0.vPBsZuE2_rkm5QmgRvJ6IUwS_I7GgehoXGg4yCzqu5Y';
const ADMIN_EMAIL = 'jenifferpradot@gmail.com';

let supabaseClient;

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
            if (typeof window.supabase === 'undefined') throw new Error("Supabase não carregado.");
            supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

            const { data: { session }, error } = await supabaseClient.auth.getSession();
            if (error) throw error;

            await this.handleAuthStateChange(session);

            supabaseClient.auth.onAuthStateChange(async (_event, session) => {
                await this.handleAuthStateChange(session);
            });
        } catch (err) {
            console.error("Erro init:", err);
            UI.showScreen('auth-screen');
        } finally {
            this.setLoading(false);
        }
    }

    async handleAuthStateChange(session) {
        if (session) {
            this.user = session.user;
            this.role = (this.user.email === ADMIN_EMAIL) ? 'admin' : 'cliente';

            try {
                await supabaseClient.from('profiles').upsert({
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
                supabaseClient.from('pecas').select('*').order('created_at', { ascending: false }),
                supabaseClient.from('clientes').select('*').order('nome'),
                supabaseClient.from('pedidos').select('*').order('data', { ascending: false })
            ]);
            this.pieces = pRes.data || [];
            this.clients = cRes.data || [];
            this.orders = oRes.data || [];
        } catch (err) { console.error("Erro loadData:", err); }
        this.setLoading(false);
    }

    setLoading(val) {
        const loader = document.getElementById('loading-overlay');
        if (loader) val ? loader.classList.remove('hidden') : loader.classList.add('hidden');
    }
}

const state = new AppState();

// --- UI ---
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
                        const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
                        if (error) throw error;
                    } else if (state.authMode === 'signup') {
                        const fullName = document.getElementById('user-fullname').value.trim();
                        const { error } = await supabaseClient.auth.signUp({
                            email, password, options: { data: { full_name: fullName } }
                        });
                        if (error) throw error;
                        alert("Verifique seu e-mail para confirmar a conta!");
                    }
                } catch (err) { alert(err.message); }
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
        if (logoutBtn) logoutBtn.onclick = () => supabaseClient.auth.signOut();
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
        document.getElementById(id).classList.remove('hidden');
    },

    renderAppNav() {
        const container = document.getElementById('nav-container');
        if (!container) return;
        container.innerHTML = `
            <button class="nav-btn" data-view="dashboard"><i data-lucide="layout-dashboard"></i><span>Geral</span></button>
            <button class="nav-btn" data-view="pieces"><i data-lucide="package"></i><span>Estoques</span></button>
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
                <div class="card"><small>Vendas Totais</small><h3>R$ ${totalSales.toFixed(2)}</h3></div>
                <div class="card"><small>Peças no Estoque</small><h3>${state.pieces.length}</h3></div>
                <div class="card"><small>Total de Clientes</small><h3>${state.clients.length}</h3></div>
            </div>
            <div class="card" style="margin-top:24px">
                <h3>Minha Gestão de Crochê</h3>
                <p>Use o menu para cadastrar suas pecas e clientes.</p>
            </div>
        `;
    },

    renderPieces() {
        const content = document.getElementById('main-content');
        content.innerHTML = `
            <div class="view-header">
                <h1>Meu Estoque</h1>
                <button class="btn btn-primary" id="add-piece-btn"><i data-lucide="plus"></i> Nova Peça</button>
            </div>
            <div class="grid">
                ${state.pieces.map(p => `
                    <div class="card">
                        <h3>${p.nome}</h3>
                        <p><small>${p.linha || 'Sem linha'}</small></p>
                        <div style="margin: 10px 0; font-size: 0.9em; color: #555;">
                            <span>⚖️ ${p.peso || 0}g</span> | 
                            <span>⏰ ${p.tempo_trabalho || 0}h</span>
                        </div>
                        <div style="font-weight: bold; color: var(--primary)">R$ ${Number(p.preco_final || 0).toFixed(2)}</div>
                    </div>
                `).join('')}
            </div>
        `;

        document.getElementById('add-piece-btn').onclick = () => this.showPieceModal();
    },

    showPieceModal() {
        const html = `
            <form id="piece-form">
                <div class="form-group">
                    <label>Nome da Peça</label>
                    <input type="text" id="p-nome" required>
                </div>
                <div class="form-group">
                    <label>Tipo de Linha/Fio</label>
                    <input type="text" id="p-linha" placeholder="Ex: Barroco 6">
                </div>
                <div class="grid" style="gap:10px">
                    <div class="form-group">
                        <label>Peso (Gramas)</label>
                        <input type="number" id="p-peso" placeholder="0">
                    </div>
                    <div class="form-group">
                        <label>Tempo (Horas)</label>
                        <input type="number" id="p-tempo" placeholder="0">
                    </div>
                </div>
                <div class="form-group">
                    <label>Preço de Venda (R$)</label>
                    <input type="number" step="0.01" id="p-preco" required>
                </div>
                <button type="submit" class="btn btn-primary" style="width:100%">Salvar Peça</button>
            </form>
        `;
        this.toggleModal(true, "Cadastrar Peça", html);

        document.getElementById('piece-form').onsubmit = async (e) => {
            e.preventDefault();
            const data = {
                nome: document.getElementById('p-nome').value,
                linha: document.getElementById('p-linha').value,
                peso: document.getElementById('p-peso').value,
                tempo_trabalho: document.getElementById('p-tempo').value,
                preco_final: document.getElementById('p-preco').value,
                user_id: state.user.id
            };

            state.setLoading(true);
            const { error } = await supabaseClient.from('pecas').insert(data);
            if (error) alert(error.message);
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
                ${state.clients.map(c => `
                    <div class="card">
                        <h3>${c.nome}</h3>
                        <p><small>📱 ${c.whatsapp || 'N/A'}</small></p>
                        <p style="font-size: 0.8em; color: #777;">📍 ${c.endereco || 'Endereço não informado'}</p>
                    </div>
                `).join('')}
            </div>
        `;
        document.getElementById('add-client-btn').onclick = () => this.showClientModal();
    },

    showClientModal() {
        const html = `
            <form id="client-form">
                <div class="form-group">
                    <label>Nome do Cliente</label>
                    <input type="text" id="c-nome" required>
                </div>
                <div class="form-group">
                    <label>WhatsApp</label>
                    <input type="text" id="c-whatsapp" placeholder="(00) 00000-0000">
                </div>
                <div class="form-group">
                    <label>Endereço</label>
                    <input type="text" id="c-endereco">
                </div>
                <button type="submit" class="btn btn-primary" style="width:100%">Salvar Cliente</button>
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
            const { error } = await supabaseClient.from('clientes').insert(data);
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
            <div class="card"><p>Aba de pedidos em desenvolvimento. Aqui você poderá vincular Peças a Clientes.</p></div>
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
} catch (e) { console.error("Erro crítico:", e); }
