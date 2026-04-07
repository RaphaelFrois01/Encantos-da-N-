/**
 * ENCANTOS DA NÊ - SISTEMA DE GESTÃO
 * Versão Blindada v2.1 - Zero Conflitos
 */

(function () {
    // --- Configurações Seguras ---
    const CONFIG_URL = 'https://dxfblhrsxknbhfwncalx.supabase.co';
    const CONFIG_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4ZmJsaHJzeGtuYmhmd25jYWx4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1NjE3NDYsImV4cCI6MjA5MTEzNzc0Nn0.vPBsZuE2_rkm5QmgRvJ6IUwS_I7GgehoXGg4yCzqu5Y';
    const MASTER_ADMIN = 'jenifferpradot@gmail.com';

    let EngenhoNe; // Motor de conexão renomeado e isolado

    // --- Estado da Aplicação ---
    const state = {
        user: null,
        role: null,
        pieces: [],
        clients: [],
        orders: [],
        currentView: 'dashboard',
        authMode: 'login',

        async init() {
            UI.setLoading(true);
            try {
                if (!window.supabase) throw new Error("Conexão com o servidor falhou.");

                EngenhoNe = window.supabase.createClient(CONFIG_URL, CONFIG_KEY);

                const { data: { session }, error } = await EngenhoNe.auth.getSession();
                if (error) throw error;

                await this.handleAuth(session);

                EngenhoNe.auth.onAuthStateChange(async (_event, session) => {
                    await this.handleAuth(session);
                });
            } catch (err) {
                console.error("Erro Crítico:", err);
                UI.showScreen('auth-screen');
            } finally {
                UI.setLoading(false);
            }
        },

        async handleAuth(session) {
            if (session) {
                this.user = session.user;
                this.role = (this.user.email === MASTER_ADMIN) ? 'admin' : 'cliente';

                try {
                    await EngenhoNe.from('profiles').upsert({
                        id: this.user.id,
                        role: this.role,
                        full_name: this.user.user_metadata.full_name || 'Usuário'
                    });
                } catch (e) { }

                UI.showScreen('app-screen');
                await this.loadAllData();
                UI.renderNav();
                UI.renderView('dashboard');
            } else {
                this.user = null;
                UI.showScreen('auth-screen');
                UI.renderAuth();
            }
        },

        async loadAllData() {
            if (!this.user) return;
            UI.setLoading(true);
            try {
                const [p, c, o] = await Promise.all([
                    EngenhoNe.from('pecas').select('*').order('created_at', { ascending: false }),
                    EngenhoNe.from('clientes').select('*').order('nome'),
                    EngenhoNe.from('pedidos').select('*').order('data', { ascending: false })
                ]);
                this.pieces = p.data || [];
                this.clients = c.data || [];
                this.orders = o.data || [];
            } catch (err) { }
            UI.setLoading(false);
        }
    };

    // --- Interface do Usuário ---
    const UI = {
        init() {
            this.bindEvents();
            state.init();
        },

        bindEvents() {
            const authForm = document.getElementById('auth-form');
            if (authForm) {
                authForm.onsubmit = async (e) => {
                    e.preventDefault();
                    const email = document.getElementById('user-email').value.trim();
                    const pass = document.getElementById('user-password').value;
                    UI.setLoading(true);
                    try {
                        if (state.authMode === 'login') {
                            const { error } = await EngenhoNe.auth.signInWithPassword({ email, password: pass });
                            if (error) throw error;
                        } else {
                            const name = document.getElementById('user-fullname').value.trim();
                            const { error } = await EngenhoNe.auth.signUp({
                                email, password: pass, options: { data: { full_name: name } }
                            });
                            if (error) throw error;
                            alert("Verifique seu e-mail para ativar a conta!");
                        }
                    } catch (err) { alert(err.message); }
                    UI.setLoading(false);
                };
            }

            document.getElementById('toggle-auth').onclick = (e) => {
                e.preventDefault();
                state.authMode = (state.authMode === 'login') ? 'signup' : 'login';
                this.renderAuth();
            };

            document.getElementById('logout-btn').onclick = () => EngenhoNe.auth.signOut();
            document.getElementById('close-modal').onclick = () => this.modal(false);
        },

        renderAuth() {
            const isLogin = state.authMode === 'login';
            document.getElementById('auth-title').innerText = isLogin ? "Encantos da Nê" : "Criar Conta";
            document.getElementById('name-group').classList.toggle('hidden', isLogin);
            document.getElementById('auth-submit-btn').innerText = isLogin ? "Entrar" : "Cadastrar";
            document.getElementById('toggle-auth').innerText = isLogin ? "Não tem conta? Cadastre-se" : "Já tem conta? Login";
        },

        showScreen(id) {
            document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
            document.getElementById(id).classList.remove('hidden');
        },

        renderNav() {
            const nav = document.getElementById('nav-container');
            nav.innerHTML = `
                <button class="nav-btn active" data-view="dashboard"><i data-lucide="layout-dashboard"></i><span>Home</span></button>
                <button class="nav-btn" data-view="pieces"><i data-lucide="package"></i><span>Estoque</span></button>
                <button class="nav-btn" data-view="clients"><i data-lucide="users"></i><span>Clientes</span></button>
            `;
            if (window.lucide) window.lucide.createIcons();
            nav.querySelectorAll('.nav-btn').forEach(b => {
                b.onclick = () => {
                    nav.querySelectorAll('.nav-btn').forEach(x => x.classList.remove('active'));
                    b.classList.add('active');
                    this.renderView(b.dataset.view);
                };
            });
        },

        renderView(view) {
            const content = document.getElementById('main-content');
            content.innerHTML = '';
            if (view === 'dashboard') {
                content.innerHTML = `
                    <div class="view-header"><h1>Bem-vinda de volta!</h1></div>
                    <div class="grid">
                        <div class="card"><small>Produtos</small><h3>${state.pieces.length}</h3></div>
                        <div class="card"><small>Clientes</small><h3>${state.clients.length}</h3></div>
                    </div>
                `;
            } else if (view === 'pieces') {
                content.innerHTML = `
                    <div class="view-header">
                        <h1>Estoque</h1>
                        <button class="btn btn-primary" id="btn-add-p">+ Novo Produto</button>
                    </div>
                    <div class="grid">
                        ${state.pieces.map(p => `
                            <div class="card">
                                <h3>${p.nome}</h3>
                                <p style="color:var(--primary); font-weight:bold">R$ ${Number(p.preco_final).toFixed(2).replace('.', ',')}</p>
                            </div>
                        `).join('')}
                    </div>
                `;
                document.getElementById('btn-add-p').onclick = () => this.showAddPiece();
            } else if (view === 'clients') {
                content.innerHTML = `
                    <div class="view-header">
                        <h1>Clientes</h1>
                        <button class="btn btn-primary" id="btn-add-c">+ Novo Cliente</button>
                    </div>
                    <div class="grid">
                        ${state.clients.map(c => `
                            <div class="card"><h3>${c.nome}</h3><p>${c.whatsapp || ''}</p></div>
                        `).join('')}
                    </div>
                `;
                document.getElementById('btn-add-c').onclick = () => this.showAddClient();
            }
            if (window.lucide) window.lucide.createIcons();
        },

        showAddPiece() {
            const html = `
                <form id="f-p">
                    <div class="form-group"><label>Nome</label><input type="text" id="fn" required></div>
                    <div class="form-group"><label>Custo Materiais (R$)</label><input type="number" step="0.01" id="fm" required></div>
                    <div class="form-group"><label>Horas Gastas</label><input type="number" id="fh" required></div>
                    <div class="form-group"><label>Valor Hora (R$)</label><input type="number" id="fvh" value="10.00" required></div>
                    <div class="form-group"><label>% Lucro</label><input type="number" id="fl" value="20" required></div>
                    <div id="p-calc" style="background:#fef1f5; padding: 10px; border-radius:5px; margin-bottom:15px; font-weight:bold">Total Sugerido: R$ 0,00</div>
                    <button type="submit" class="btn btn-primary" style="width:100%">Salvar</button>
                </form>
            `;
            this.modal(true, "Novo Crochê", html);
            const calc = () => {
                const m = Number(document.getElementById('fm').value) || 0;
                const h = Number(document.getElementById('fh').value) || 0;
                const v = Number(document.getElementById('fvh').value) || 0;
                const l = Number(document.getElementById('fl').value) || 0;
                const total = (m + (h * v)) * (1 + (l / 100));
                document.getElementById('p-calc').innerText = "Total Sugerido: R$ " + total.toFixed(2).replace('.', ',');
                return total;
            };
            ['fm', 'fh', 'fvh', 'fl'].forEach(id => document.getElementById(id).oninput = calc);

            document.getElementById('f-p').onsubmit = async (e) => {
                e.preventDefault();
                const total = calc();
                UI.setLoading(true);
                const { error } = await EngenhoNe.from('pecas').insert({
                    nome: document.getElementById('fn').value,
                    preco_final: total,
                    tempo_trabalho: Number(document.getElementById('fh').value),
                    user_id: state.user.id
                });
                if (!error) { this.modal(false); await state.loadAllData(); this.renderView('pieces'); }
                UI.setLoading(false);
            };
        },

        showAddClient() {
            const html = `
                <form id="f-c">
                    <div class="form-group"><label>Nome</label><input type="text" id="cn" required></div>
                    <div class="form-group"><label>WhatsApp</label><input type="text" id="cw"></div>
                    <button type="submit" class="btn btn-primary" style="width:100%">Salvar</button>
                </form>
            `;
            this.modal(true, "Novo Cliente", html);
            document.getElementById('f-c').onsubmit = async (e) => {
                e.preventDefault();
                UI.setLoading(true);
                const { error } = await EngenhoNe.from('clientes').insert({
                    nome: document.getElementById('cn').value,
                    whatsapp: document.getElementById('cw').value,
                    user_id: state.user.id
                });
                if (!error) { this.modal(false); await state.loadAllData(); this.renderView('clients'); }
                UI.setLoading(false);
            };
        },

        modal(show, title = '', body = '') {
            const m = document.getElementById('modal-container');
            if (show) {
                document.getElementById('modal-title').innerText = title;
                document.getElementById('modal-body').innerHTML = body;
                m.classList.remove('hidden');
                setTimeout(() => m.classList.add('active'), 10);
            } else {
                m.classList.remove('active');
                setTimeout(() => m.classList.add('hidden'), 300);
            }
        },

        setLoading(v) {
            const l = document.getElementById('loading-overlay');
            if (l) v ? l.classList.remove('hidden') : l.classList.add('hidden');
        }
    };

    // Inicialização
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => UI.init());
    } else {
        UI.init();
    }
})();
