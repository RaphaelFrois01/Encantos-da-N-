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
        console.log("🚀 Iniciando Encantos da Nê...");
        this.setLoading(true);

        try {
            // Verifica se a biblioteca do Supabase carregou
            if (typeof window.supabase === 'undefined') {
                throw new Error("Não foi possível conectar ao banco de dados. Verifique sua internet.");
            }

            supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

            // Obtém a sessão atual
            const { data: { session }, error } = await supabase.auth.getSession();
            if (error) throw error;

            if (session) {
                await this.handleAuthStateChange(session);
            } else {
                UI.showScreen('auth-screen');
                UI.renderAuthUI();
            }

            // Ouve mudanças na autenticação
            supabase.auth.onAuthStateChange(async (_event, session) => {
                await this.handleAuthStateChange(session);
            });

        } catch (err) {
            console.error("❌ Erro de Inicialização:", err);
            UI.showScreen('auth-screen');
            UI.renderAuthUI();
            setTimeout(() => alert("Aviso: " + err.message), 500);
        } finally {
            this.setLoading(false);
        }
    }

    async handleAuthStateChange(session) {
        if (session) {
            this.user = session.user;
            this.role = (this.user.email === ADMIN_EMAIL) ? 'admin' : 'cliente';
            
            try {
                // Tenta atualizar ou criar o perfil do usuário
                await supabase.from('profiles').upsert({
                    id: this.user.id,
                    role: this.role,
                    full_name: this.user.user_metadata.full_name || 'Usuário'
                }, { onConflict: 'id' });
            } catch (e) {
                console.warn("⚠️ Não foi possível salvar o perfil no banco agora.");
            }

            // Redireciona para o Dashboard correspondente
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
        } catch (err) {
            console.error("⚠️ Erro ao carregar dados do banco:", err);
        }
        this.setLoading(false);
    }

    setLoading(val) {
        const loader = document.getElementById('loading-overlay');
        if (loader) {
            val ? loader.classList.remove('hidden') : loader.classList.add('hidden');
        }
    }
}

const state = new AppState();

// --- Controlador da Interface (UI) ---
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
            
            if (!supabase) {
                alert("O banco de dados não está conectado. Tente recarregar a página.");
                return;
            }

            state.setLoading(true);
            try {
                if (state.authMode === 'login') {
                    const { error } = await supabase.auth.signInWithPassword({ email, password });
                    if (error) throw error;
                } else if (state.authMode === 'signup') {
                    if (!fullName) throw new Error("Por favor, informe seu nome.");
                    const { error } = await supabase.auth.signUp({ 
                        email, password, 
                        options: { data: { full_name: fullName } } 
                    });
                    if (error) throw error;
                    alert("Conta criada! Verifique seu e-mail para confirmar (veja o spam).");
                } else if (state.authMode === 'recovery') {
                    const { error } = await supabase.auth.resetPasswordForEmail(email);
                    if (error) throw error;
                    alert("Link de recuperação enviado para o seu e-mail.");
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
            subtitle.innerText = "Sua vitrine de crochê exclusiva";
            submitBtn.innerText = "Cadastrar";
            toggleBtn.innerText = "Já tem conta? Entre aqui";
            nameGroup.classList.remove('hidden');
            passGroup.classList.remove('hidden');
            forgotBtn.classList.add('hidden');
        } else if (state.authMode === 'recovery') {
            title.innerText = "Recuperar Senha";
            subtitle.innerText = "Pense no seu e-mail como um novelo pronto para desenrolar";
            submitBtn.innerText = "Enviar Link";
            toggleBtn.innerText = "Voltar para o Login";
            nameGroup.classList.add('hidden');
            passGroup.classList.add('hidden');
            forgotBtn.classList.add('hidden');
        } else {
            title.innerText = "Encantos da Nê";
            subtitle.innerText = "Bem-vinda de volta ao seu sistema";
            submitBtn.innerText = "Entrar";
            toggleBtn.innerText = "Não tem conta? Comece aqui";
            nameGroup.classList.add('hidden');
            passGroup.classList.remove('hidden');
            forgotBtn.classList.remove('hidden');
        }
    },

    setupGeneralListeners() {
        document.getElementById('close-modal').onclick = () => this.toggleModal(false);
        window.onclick = (e) => {
            if (e.target === document.getElementById('modal-container')) this.toggleModal(false);
        };
    },

    showScreen(id) {
        document.getElementById('auth-screen').classList.add('hidden');
        document.getElementById('app-screen').classList.add('hidden');
        document.getElementById(id).classList.remove('hidden');
    },

    renderAppNav() {
        const container = document.getElementById('nav-container');
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
                <button class="nav-btn" data-view="client-ideias"><i data-lucide="lightbulb"></i><span>Minhas Ideias</span></button>
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
        content.innerHTML = '';
        state.currentView = view;

        if (state.role === 'admin') {
            switch(view) {
                case 'dashboard': this.renderAdminDashboard(); break;
                case 'pieces': this.renderAdminPieces(); break;
                case 'ideias': this.renderAdminIdeias(); break;
                default: content.innerHTML = `<div class="card"><h3>Em breve: ${view}</h3></div>`;
            }
        } else {
            switch(view) {
                case 'dashboard': this.renderClientCatalog(); break;
                case 'client-ideias': this.renderClientIdeias(); break;
            }
        }
        if (window.lucide) lucide.createIcons();
    },

    renderAdminDashboard() {
        const totalSales = state.orders.reduce((sum, o) => sum + Number(o.total || 0), 0);
        document.getElementById('main-content').innerHTML = `
            <div class="view-header"><h1>Painel Administrativo</h1></div>
            <div class="grid">
                <div class="card"><small>Vendas Totais</small><h3>R$ ${totalSales.toFixed(2)}</h3></div>
                <div class="card"><small>Peças Catálogo</small><h3>${state.pieces.length}</h3></div>
            </div>
            <div class="card" style="margin-top: 24px">
                <h3>Boas-vindas, Jeniffer!</h3>
                <p>Use o menu para gerenciar seu negócio.</p>
            </div>
        `;
    },

    renderAdminPieces() {
        document.getElementById('main-content').innerHTML = `
            <div class="view-header"><h1>Gerenciar Peças</h1></div>
            <div class="grid">
                ${state.pieces.length === 0 ? '<p>Nenhuma peça no banco de dados.</p>' : 
                  state.pieces.map(p => `
                    <div class="card">
                        <h3>${p.nome}</h3>
                        <p><small>${p.linha}</small></p>
                        <div style="margin-top: 10px; font-weight: bold; color: var(--primary)">R$ ${Number(p.preco_final).toFixed(2)}</div>
                    </div>
                  `).join('')}
            </div>
        `;
    },

    renderAdminIdeias() {
        document.getElementById('main-content').innerHTML = `
            <div class="view-header"><h1>Ideias das Clientes</h1></div>
            ${state.ideias.length === 0 ? '<p>Tudo tranquilo por aqui.</p>' : 
              state.ideias.map(i => `
                <div class="card">
                    <p>${i.descricao}</p>
                    <small>Contato: ${i.contato_preferencial}</small>
                </div>
              `).join('')}
        `;
    },

    renderClientCatalog() {
        document.getElementById('main-content').innerHTML = `
            <div class="view-header"><h1>Catálogo de Peças 🧶</h1></div>
            <div class="grid">
                ${state.pieces.map(p => `
                    <div class="card">
                        <h3>${p.nome}</h3>
                        <p><small>${p.linha}</small></p>
                        <div style="margin-top: 10px; font-weight: bold; color: var(--primary)">R$ ${Number(p.preco_final).toFixed(2)}</div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    renderClientIdeias() {
        document.getElementById('main-content').innerHTML = `
            <div class="view-header"><h1>Minhas Ideias 💡</h1></div>
            <div class="card">
                <h3>Viu algo que amou e quer pra você?</h3>
                <p>Mande uma sugestão para a Nê!</p>
                <button class="btn btn-primary" style="margin-top: 12px">Contar minha ideia</button>
            </div>
        `;
    },

    toggleModal(show, title = '', contentHtml = '') {
        const modal = document.getElementById('modal-container');
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

// Inicialização segura
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => UI.init());
} else {
    UI.init();
}
