// --- Configurações do Supabase ---
const SUPABASE_URL = 'https://dxfblhrsxknbhfwncalx.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4ZmJsaHJzeGtuYmhmd25jYWx4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1NjE3NDYsImV4cCI6MjA5MTEzNzc0Nn0.vPBsZuE2_rkm5QmgRvJ6IUwS_I7GgehoXGg4yCzqu5Y';
const ADMIN_EMAIL = 'jenifferpradot@gmail.com';

let supabase;

// --- Gestão de Estado ---
class AppState {
    constructor() {
        this.user = null;
        this.role = null;
        this.pieces = [];
        this.clients = [];
        this.orders = [];
        this.ideias = [];
        this.currentView = 'dashboard';
        this.authMode = 'login';
    }

    async init() {
        this.setLoading(true);
        try {
            if (typeof window.supabase === 'undefined') {
                throw new Error("Supabase não carregado.");
            }
            supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

            const { data: { session }, error } = await supabase.auth.getSession();
            if (error) throw error;

            await this.handleAuthStateChange(session);

            supabase.auth.onAuthStateChange(async (_event, session) => {
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
            console.log("🔓 Sessão ativa para:", session.user.email);
            this.user = session.user;
            this.role = (this.user.email === ADMIN_EMAIL) ? 'admin' : 'cliente';

            try {
                await supabase.from('profiles').upsert({
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
            if (this.role === 'admin') {
                const [pRes, cRes, oRes, iRes] = await Promise.all([
                    supabase.from('pecas').select('*').order('created_at', { ascending: false }),
                    supabase.from('clientes').select('*').order('nome'),
                    supabase.from('pedidos').select('*').order('data', { ascending: false }),
                    supabase.from('ideias').select('*').order('created_at', { ascending: false })
                ]);
                this.pieces = pRes.data || [];
                this.clients = cRes.data || [];
                this.orders = oRes.data || [];
                this.ideias = iRes.data || [];
            } else {
                const [pRes, iRes] = await Promise.all([
                    supabase.from('pecas').select('nome, linha, preco_final').order('nome'),
                    supabase.from('ideias').select('*').eq('user_id', this.user.id).order('created_at', { ascending: false })
                ]);
                this.pieces = pRes.data || [];
                this.ideias = iRes.data || [];
            }
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
        form.onsubmit = async (e) => {
            e.preventDefault();
            const email = document.getElementById('user-email').value.trim();
            const password = document.getElementById('user-password').value;
            const fullName = document.getElementById('user-fullname').value.trim();

            state.setLoading(true);
            try {
                if (state.authMode === 'login') {
                    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
                    if (error) {
                        if (error.message.includes("Email not confirmed")) {
                            throw new Error("⚠️ Verifique seu e-mail para confirmar a conta antes de entrar.");
                        }
                        throw error;
                    }
                } else if (state.authMode === 'signup') {
                    const { error } = await supabase.auth.signUp({
                        email, password, options: { data: { full_name: fullName } }
                    });
                    if (error) throw error;
                    alert("Conta criada! Verifique seu e-mail e clique no link de confirmação.");
                } else if (state.authMode === 'recovery') {
                    const { error } = await supabase.auth.resetPasswordForEmail(email);
                    if (error) throw error;
                    alert("Link de recuperação enviado.");
                }
            } catch (err) {
                alert("Erro: " + err.message);
            }
            state.setLoading(false);
        };

        document.getElementById('toggle-auth').onclick = () => {
            state.authMode = (state.authMode === 'login') ? 'signup' : 'login';
            this.renderAuthUI();
        };

        document.getElementById('forgot-password').onclick = () => {
            state.authMode = 'recovery';
            this.renderAuthUI();
        };

        document.getElementById('logout-btn').onclick = () => supabase.auth.signOut();
    },

    renderAuthUI() {
        const title = document.getElementById('auth-title');
        const subtitle = document.getElementById('auth-subtitle');
        const submitBtn = document.getElementById('auth-submit-btn');
        const toggleBtn = document.getElementById('toggle-auth');
        const nameGroup = document.getElementById('name-group');
        const passGroup = document.getElementById('password-group');
        const forgotBtn = document.getElementById('forgot-password');

        if (state.authMode === 'signup') {
            title.innerText = "Criar Conta";
            subtitle.innerText = "Sua vitrine de crochê";
            submitBtn.innerText = "Cadastrar";
            toggleBtn.innerText = "Já tem conta? Entre";
            nameGroup.classList.remove('hidden');
            passGroup.classList.remove('hidden');
            forgotBtn.classList.add('hidden');
        } else if (state.authMode === 'recovery') {
            title.innerText = "Recuperar Senha";
            subtitle.innerText = "Enviaremos um link de acesso";
            submitBtn.innerText = "Enviar Link";
            toggleBtn.innerText = "Voltar";
            nameGroup.classList.add('hidden');
            passGroup.classList.add('hidden');
            forgotBtn.classList.add('hidden');
        } else {
            title.innerText = "Encantos da Nê";
            subtitle.innerText = "Dê vida ao seu crochê";
            submitBtn.innerText = "Entrar";
            toggleBtn.innerText = "Criar nova conta";
            nameGroup.classList.add('hidden');
            passGroup.classList.remove('hidden');
            forgotBtn.classList.remove('hidden');
        }
    },

    setupGeneralListeners() {
        const closeMod = document.getElementById('close-modal');
        if (closeMod) closeMod.onclick = () => this.toggleModal(false);
    },

    showScreen(id) {
        document.getElementById('auth-screen').classList.add('hidden');
        document.getElementById('app-screen').classList.add('hidden');
        document.getElementById(id).classList.remove('hidden');
    },

    renderAppNav() {
        const container = document.getElementById('nav-container');
        if (!container) return;
        let html = '';
        if (state.role === 'admin') {
            html = `
                <button class="nav-btn" data-view="dashboard"><i data-lucide="layout-dashboard"></i><span>Geral</span></button>
                <button class="nav-btn" data-view="pieces"><i data-lucide="package"></i><span>Peças</span></button>
                <button class="nav-btn" data-view="clients"><i data-lucide="users"></i><span>Clientes</span></button>
                <button class="nav-btn" data-view="orders"><i data-lucide="shopping-cart"></i><span>Pedidos</span></button>
                <button class="nav-btn" data-view="ideias"><i data-lucide="lightbulb"></i><span>Sugestões</span></button>
            `;
        } else {
            html = `
                <button class="nav-btn" data-view="dashboard"><i data-lucide="home"></i><span>Vitrine</span></button>
                <button class="nav-btn" data-view="client-ideias"><i data-lucide="lightbulb"></i><span>Sugestões</span></button>
            `;
        }
        container.innerHTML = html;
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

        if (state.role === 'admin') {
            switch (view) {
                case 'dashboard': this.renderAdminDashboard(); break;
                case 'pieces': this.renderAdminPieces(); break;
                case 'ideias': this.renderAdminIdeias(); break;
                default: content.innerHTML = `<div class="card"><h3>Em construção: ${view}</h3></div>`;
            }
        } else {
            switch (view) {
                case 'dashboard': this.renderClientCatalog(); break;
                case 'client-ideias': this.renderClientIdeias(); break;
            }
        }
        if (window.lucide) lucide.createIcons();
    },

    renderAdminDashboard() {
        const totalSales = state.orders.reduce((sum, o) => sum + Number(o.total || 0), 0);
        document.getElementById('main-content').innerHTML = `
            <div class="view-header"><h1>Olá, Nê! 🧶</h1></div>
            <div class="grid">
                <div class="card"><small>Vendas Totais</small><h3>R$ ${totalSales.toFixed(2)}</h3></div>
                <div class="card"><small>Total de Peças</small><h3>${state.pieces.length}</h3></div>
            </div>
            <div class="card" style="margin-top: 24px">
                <h3>Resumo de Atividades</h3>
                <p>Navegue pelo menu para gerenciar seu estoque e pedidos.</p>
            </div>
        `;
    },

    renderAdminPieces() {
        document.getElementById('main-content').innerHTML = `
            <div class="view-header"><h1>Estoque de Peças</h1></div>
            <div class="grid">
                ${state.pieces.map(p => `
                    <div class="card">
                        <h3>${p.nome}</h3><p><small>${p.linha}</small></p>
                        <div style="margin-top: 10px; font-weight: bold; color: var(--primary)">R$ ${Number(p.preco_final).toFixed(2)}</div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    renderAdminIdeias() {
        document.getElementById('main-content').innerHTML = `
            <div class="view-header"><h1>Ideias Recebidas</h1></div>
            ${state.ideias.length === 0 ? '<p>Sem novas sugestões.</p>' :
                state.ideias.map(i => `
                <div class="card">
                    <p>${i.descricao}</p><small>Contato: ${i.contato_preferencial}</small>
                </div>
              `).join('')}
        `;
    },

    renderClientCatalog() {
        document.getElementById('main-content').innerHTML = `
            <div class="view-header"><h1>Vitrine de Peças 🧶</h1></div>
            <div class="grid">
                ${state.pieces.map(p => `
                    <div class="card">
                        <h3>${p.nome}</h3><p><small>${p.linha}</small></p>
                        <div style="margin-top: 10px; font-weight: bold; color: var(--primary)">R$ ${Number(p.preco_final).toFixed(2)}</div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    renderClientIdeias() {
        document.getElementById('main-content').innerHTML = `
            <div class="view-header"><h1>Minhas Sugestões 💡</h1></div>
            <div class="card">
                <h3>Tem uma ideia especial?</h3>
                <p>Conte para a Nê e vamos transformar em crochê!</p>
                <button class="btn btn-primary" style="margin-top: 12px">Mandar Minha Ideia</button>
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

UI.init();
