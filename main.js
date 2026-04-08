/**
 * ENCANTOS DA NÊ - GESTÃO PRO CLOUD v9.0 (Premium Mobile Refactor)
 * Backend: Supabase Cloud Database
 */

// --- CONFIGURAÇÕES E CONEXÃO ---
const SB_URL = 'https://ahmuiepedgoqecfmszyf.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFobXVpZXBlZGdvcWVjZm1zenlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2MDY0NzMsImV4cCI6MjA5MTE4MjQ3M30.5GWr3Xq0MNPUDxq12cV6d0PboW7nP-RBDwYftBvAnA4';

let supabase;
let authMode = 'login';

// --- ESTADO GLOBAL ---
let state = {
    user: null,
    materiais: [],
    custosFixos: [],
    produtos: [],
    clientes: [],
    vendas: [],
    config: { valorHora: 15.15, salarioDesejado: 2000, horasDia: 6, diasMes: 22, userName: "Ateliê" },
    currentTab: 'inicio',
    currentSubTab: 'produtos'
};

// --- INICIALIZAÇÃO ---
window.onerror = function (msg, url, line) {
    if (!msg.includes('lucide') && !msg.includes('ResizeObserver')) {
        console.error(`Erro: ${msg} em ${url}:${line}`);
        showToast("Ocorreu um erro inesperado. Tente recarregar.", "error");
    }
};

async function initApp() {
    try {
        if (!window.supabase) {
            showToast("Falha ao carregar banco de dados. Verifique sua rede.", "error");
            return;
        }
        supabase = window.supabase.createClient(SB_URL, SB_KEY);
        setupAuthListeners();
        initLucide();
        console.log("App iniciado com sucesso (v9.0)");
    } catch (e) {
        showToast("Erro fatal na inicialização: " + e.message, "error");
    }
}

if (document.readyState === 'loading') {
    document.addEventListener("DOMContentLoaded", initApp);
} else {
    initApp();
}

function initLucide() { if (window.lucide) window.lucide.createIcons(); }

// --- SISTEMA DE NOTIFICAÇÕES (TOASTS) ---
function showToast(message, type = 'info', duration = 4000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<div class="toast-content">${message}</div>`;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// --- AUTENTICAÇÃO ---
function setupAuthListeners() {
    supabase.auth.onAuthStateChange(async (event, session) => {
        console.log("Auth Event:", event);
        if (session) {
            state.user = session.user;
            showScreen('app-screen');
            await loadAllData();
            switchTab('inicio');
        } else {
            state.user = null;
            showScreen('auth-screen');
        }
    });

    const authForm = document.getElementById('auth-form');
    if (authForm) authForm.onsubmit = handleAuthSubmit;

    attachAuthToggleListeners();
}

function attachAuthToggleListeners() {
    const links = [
        { id: 'toggle-auth-link', action: () => setAuthMode(authMode === 'login' ? 'register' : 'login') },
        { id: 'forgot-password-link', action: () => setAuthMode('forgot') },
        { id: 'back-login-link', action: () => setAuthMode('login') }
    ];

    links.forEach(link => {
        const el = document.getElementById(link.id);
        if (el) el.onclick = (e) => { e.preventDefault(); link.action(); };
    });
}

function setAuthMode(mode) {
    authMode = mode;
    const elements = {
        title: document.getElementById('auth-title'),
        subtitle: document.getElementById('auth-subtitle'),
        btn: document.getElementById('auth-submit-btn'),
        nameGroup: document.getElementById('auth-name-group'),
        passGroup: document.getElementById('auth-password-group'),
        passInput: document.getElementById('auth-password'),
        toggleP: document.getElementById('toggle-auth-p'),
        forgotP: document.getElementById('forgot-password-p'),
        backP: document.getElementById('back-login-p')
    };

    if (mode === 'login') {
        elements.title.innerText = 'Bem-vinda de volta!';
        elements.subtitle.innerText = 'Acesse sua conta para sincronizar seu ateliê.';
        elements.btn.innerText = 'Acessar';
        elements.nameGroup.classList.add('hidden');
        elements.passGroup.classList.remove('hidden');
        elements.passInput.required = true;
        elements.toggleP.classList.remove('hidden');
        elements.toggleP.innerHTML = 'Não tem conta? <a href="#" id="toggle-auth-link" style="color: var(--primary);">Cadastrar agora</a>';
        elements.forgotP.classList.remove('hidden');
        elements.backP.classList.add('hidden');
    } else if (mode === 'register') {
        elements.title.innerText = 'Crie sua conta';
        elements.subtitle.innerText = 'Comece a gerenciar seu ateliê na nuvem.';
        elements.btn.innerText = 'Cadastrar';
        elements.nameGroup.classList.remove('hidden');
        elements.passGroup.classList.remove('hidden');
        elements.passInput.required = true;
        elements.toggleP.classList.remove('hidden');
        elements.toggleP.innerHTML = 'Já tem conta? <a href="#" id="toggle-auth-link" style="color: var(--primary);">Acessar</a>';
        elements.forgotP.classList.add('hidden');
        elements.backP.classList.add('hidden');
    } else if (mode === 'forgot') {
        elements.title.innerText = 'Recuperar Senha';
        elements.subtitle.innerText = 'Insira seu e-mail para receber as instruções.';
        elements.btn.innerText = 'Enviar Instruções';
        elements.nameGroup.classList.add('hidden');
        elements.passGroup.classList.add('hidden');
        elements.passInput.required = false;
        elements.toggleP.classList.add('hidden');
        elements.forgotP.classList.add('hidden');
        elements.backP.classList.remove('hidden');
    }

    attachAuthToggleListeners();
}

async function handleAuthSubmit(e) {
    e.preventDefault();
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const name = document.getElementById('auth-name')?.value || 'Ateliê';

    setLoading(true);

    try {
        if (authMode === 'login') {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            showToast("Login realizado com sucesso!", "success");
        }
        else if (authMode === 'register') {
            const { data, error } = await supabase.auth.signUp({
                email, password, options: { data: { full_name: name } }
            });
            if (error) throw error;
            if (!data.session) {
                showToast("Verifique seu e-mail para confirmar a conta.", "warning");
                setAuthMode('login');
            }
        }
        else if (authMode === 'forgot') {
            const { error } = await supabase.auth.resetPasswordForEmail(email);
            if (error) throw error;
            showToast("Instruções enviadas para seu e-mail.", "info");
            setAuthMode('login');
        }
    } catch (err) {
        let msg = err.message;
        if (msg.includes('Invalid login credentials')) msg = "E-mail ou senha incorretos.";
        if (msg.includes('User already registered')) msg = "Este e-mail já possui cadastro.";
        showToast(msg, "error");
    } finally {
        setLoading(false);
    }
}

async function handleLogout() {
    await supabase.auth.signOut();
    showToast("Você saiu da conta.", "info");
}

// --- PERSISTÊNCIA DE DADOS ---
async function loadAllData() {
    setLoading(true);
    try {
        const results = await Promise.allSettled([
            supabase.from('materiais_pro').select('*'),
            supabase.from('custos_fixos_pro').select('*'),
            supabase.from('produtos_pro').select('*'),
            supabase.from('clientes_pro').select('*'),
            supabase.from('vendas_pro').select('*').order('created_at', { ascending: false }),
            supabase.from('config_pro').select('*').single()
        ]);

        // Processar resultados de forma segura
        state.materiais = results[0].value?.data || [];
        state.custosFixos = results[1].value?.data || [];
        state.produtos = results[2].value?.data || [];
        state.clientes = results[3].value?.data || [];
        state.vendas = results[4].value?.data || [];

        const cfgResult = results[5].value;
        if (cfgResult?.data) {
            state.config = {
                valorHora: cfgResult.data.valor_hora,
                salarioDesejado: cfgResult.data.salario_desejado,
                horasDia: cfgResult.data.horas_dia,
                diasMes: cfgResult.data.dias_mes,
                userName: cfgResult.data.user_name
            };
        } else {
            console.log("Criando configuração inicial...");
            await supabase.from('config_pro').insert({
                user_id: state.user.id,
                user_name: state.user.user_metadata.full_name || 'Ateliê'
            });
        }

        renderAll();
    } catch (err) {
        console.error("Erro crítico ao carregar dados:", err);
        showToast("Erro ao sincronizar com a nuvem.", "error");
    } finally {
        setLoading(false);
    }
}

// --- NAVEGAÇÃO E TAB ---
function switchTab(tabId) {
    state.currentTab = tabId;
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.getElementById(`tab-${tabId}`).classList.remove('hidden');

    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(btn => {
        if (btn.getAttribute('onclick')?.includes(tabId)) btn.classList.add('active');
    });

    const topNav = document.getElementById('top-nav');
    if (tabId === 'precificar' || tabId === 'gestao') {
        topNav.classList.remove('hidden');
        renderTopTabs(tabId);
    } else {
        topNav.classList.add('hidden');
    }
    renderAll();
}

function renderTopTabs(context) {
    const topNav = document.getElementById('top-nav');
    const tabs = context === 'precificar'
        ? ['produtos', 'materiais', 'custos', 'maodeobra']
        : ['vendas', 'financeiro', 'estoque'];

    topNav.innerHTML = tabs.map(t => `
        <button class="top-tab-btn ${state.currentSubTab === t ? 'active' : ''}" 
                onclick="switchSubTab('${t}')">
            ${t.charAt(0).toUpperCase() + t.slice(1)}
        </button>
    `).join('');
}

function switchSubTab(subTabId) {
    state.currentSubTab = subTabId;
    document.querySelectorAll('.subtab-content').forEach(el => el.classList.add('hidden'));
    const target = document.getElementById(`subtab-${subTabId}`);
    if (target) target.classList.remove('hidden');
    renderAll();
}

// --- RENDERIZAÇÃO ---
function renderAll() {
    const userDisplay = document.getElementById('user-name-display');
    if (userDisplay) userDisplay.innerText = state.config.userName;

    if (state.currentTab === 'inicio') renderHome();
    if (state.currentSubTab === 'produtos') renderProdutos();
    if (state.currentSubTab === 'materiais') renderMateriais();
    if (state.currentSubTab === 'custos') renderCustos();
    if (state.currentSubTab === 'maodeobra') renderMaodeobraUI();
    if (state.currentSubTab === 'vendas') renderVendas();
    if (state.currentSubTab === 'financeiro') renderFinanceiro();
    if (state.currentSubTab === 'estoque') renderEstoque();
    if (state.currentTab === 'contatos') renderClientes();
    initLucide();
}

function renderHome() {
    const mesVendas = state.vendas.reduce((acc, v) => acc + v.valor, 0);
    const mesGastos = state.custosFixos.reduce((acc, c) => acc + c.valor, 0);
    document.getElementById('stat-vendas').innerText = `R$ ${mesVendas.toFixed(2)}`;
    document.getElementById('stat-gastos').innerText = `R$ ${mesGastos.toFixed(2)}`;
}

function renderMateriais() {
    const list = document.getElementById('lista-materiais');
    list.innerHTML = state.materiais.length ? state.materiais.map(m => `
        <div class="item-card">
            <div class="item-info"><h4>${m.nome}</h4><p>R$ ${m.preco_base.toFixed(4)}/${m.unidade_base}</p></div>
            <button class="btn-text" onclick="deleteItem('materiais_pro', '${m.id}')" style="color:red; background:none; border:none; font-size:1.2rem">❌</button>
        </div>
    `).join('') : '<p style="text-align:center; padding:20px; color:#999">Nenhum material cadastrado.</p>';
}

function renderCustos() {
    const list = document.getElementById('lista-custos');
    let total = 0;
    list.innerHTML = state.custosFixos.length ? state.custosFixos.map(c => {
        total += c.valor;
        return `<div class="item-card"><h4>${c.nome}</h4><span class="val">R$ ${c.valor.toFixed(2)}</span><button onclick="deleteItem('custos_fixos_pro', '${c.id}')" style="color:red; background:none; border:none; font-size:1.2rem">❌</button></div>`;
    }).join('') : '<p style="text-align:center; padding:20px; color:#999">Nenhum custo fixo.</p>';
    document.getElementById('total-custos-fixos').innerText = `R$ ${total.toFixed(2)}`;
}

function renderProdutos() {
    const list = document.getElementById('lista-produtos');
    list.innerHTML = state.produtos.length ? state.produtos.map(p => `
        <div class="item-card">
            <div class="item-info"><h4>${p.nome}</h4><p>R$ ${p.preco_final.toFixed(2)}</p></div>
            <button class="btn-text" onclick="deleteItem('produtos_pro', '${p.id}')" style="color:red; background:none; border:none; font-size:1.2rem">❌</button>
        </div>
    `).join('') : '<p style="text-align:center; padding:20px; color:#999">Nenhum produto cadastrado.</p>';
}

function renderVendas() {
    const list = document.getElementById('lista-vendas');
    list.innerHTML = state.vendas.length ? state.vendas.map(v => `
        <div class="item-card">
            <div class="item-info"><h4>${v.produto_nome}</h4><p>${v.cliente_nome || 'Cliente'}</p></div>
            <span class="text-green">R$ ${v.valor.toFixed(2)}</span>
            <button class="btn-text" onclick="deleteItem('vendas_pro', '${v.id}')" style="color:red; background:none; border:none; font-size:1.2rem">❌</button>
        </div>
    `).join('') : '<p style="text-align:center; padding:20px; color:#999">Nenhuma venda registrada.</p>';
}

function renderFinanceiro() {
    const entradas = state.vendas.reduce((acc, v) => acc + v.valor, 0);
    const saidas = state.custosFixos.reduce((acc, c) => acc + c.valor, 0);
    document.getElementById('fin-entradas').innerText = `R$ ${entradas.toFixed(2)}`;
    document.getElementById('fin-saidas').innerText = `R$ ${saidas.toFixed(2)}`;
    document.getElementById('fin-saldo').innerText = `R$ ${(entradas - saidas).toFixed(2)}`;
}

function renderEstoque() {
    const list = document.getElementById('lista-estoque');
    list.innerHTML = state.materiais.map(m => `
        <div class="item-card"><h4>${m.nome}</h4><span>Sincronizado Cloud</span></div>
    `).join('');
}

function renderClientes() {
    const list = document.getElementById('lista-clientes');
    list.innerHTML = state.clientes.length ? state.clientes.map(c => `
        <div class="item-card"><h4>${c.nome}</h4><button onclick="deleteItem('clientes_pro', '${c.id}')" style="color:red; background:none; border:none; font-size:1.2rem">❌</button></div>
    `).join('') : '<p style="text-align:center; padding:20px; color:#999">Nenhum contato salvo.</p>';
}

function renderMaodeobraUI() {
    document.getElementById('cfg-salario').value = state.config.salarioDesejado;
    document.getElementById('cfg-horas-dia').value = state.config.horasDia;
    document.getElementById('cfg-dias-mes').value = state.config.diasMes;
    document.getElementById('display-valor-hora').innerText = `R$ ${state.config.valorHora.toFixed(2)}`;
}

// --- AÇÕES ---
async function calculateLabor() {
    const s = Number(document.getElementById('cfg-salario').value) || 0;
    const h = Number(document.getElementById('cfg-horas-dia').value) || 1;
    const d = Number(document.getElementById('cfg-dias-mes').value) || 1;
    const vh = s / (h * d);

    state.config = { ...state.config, salarioDesejado: s, horasDia: h, diasMes: d, valorHora: vh };
    document.getElementById('display-valor-hora').innerText = `R$ ${vh.toFixed(2)}`;

    await supabase.from('config_pro').upsert({
        user_id: state.user.id,
        salario_desejado: s, horas_dia: h, dias_mes: d, valor_hora: vh
    });
}

async function updateUserName() {
    const name = document.getElementById('cfg-user-name').value;
    if (!name) return;
    state.config.userName = name;
    document.getElementById('user-name-display').innerText = name;
    await supabase.from('config_pro').upsert({ user_id: state.user.id, user_name: name });
    showToast("Perfil atualizado!", "success");
}

function showModal(type) {
    const c = document.getElementById('modal-container');
    const t = document.getElementById('modal-title');
    const b = document.getElementById('modal-body');
    c.classList.remove('hidden');

    if (type === 'material') {
        t.innerText = "Novo Material Cloud";
        b.innerHTML = `
            <form onsubmit="handleMaterialSubmit(event)">
                <div class="form-group"><label>Nome</label><input id="m-nome" placeholder="Ex: Fio Amigurumi" required></div>
                <div class="form-group"><label>Tipo de Medida</label><select id="m-tipo" onchange="updateMatUnits()" class="w-full" style="padding:14px; border-radius:14px; border:2px solid #EDF2F7;"><option value="massa">Peso (g/kg)</option><option value="comprimento">Comprimento (cm/m)</option><option value="unidade">Unid</option></select></div>
                <div style="display:flex; gap:10px" class="form-group">
                    <div style="flex:1"><label>Qtd Comprada</label><input id="m-quant" type="number" placeholder="Qtd"></div>
                    <div style="flex:1"><label>Unidade</label><select id="m-unid-compra" class="w-full" style="padding:14px; border-radius:14px; border:2px solid #EDF2F7;"></select></div>
                </div>
                <div class="form-group"><label>Preço Pago (R$)</label><input id="m-preco" type="number" step="0.01" placeholder="Ex: 25.00"></div>
                <button type="submit" class="btn btn-primary w-full">Salvar na Nuvem</button>
            </form>
        `;
        updateMatUnits();
    } else if (type === 'product') {
        t.innerText = "Novo Produto Cloud";
        const mats = state.materiais.map(m => `<option value="${m.id}">${m.nome}</option>`).join('');
        b.innerHTML = `
            <form onsubmit="handleProductSubmit(event)">
                <div class="form-group"><label>Nome do Produto</label><input id="p-nome" placeholder="Ex: Polvo de Crochê" required></div>
                <div class="form-group"><label>Tempo de Produção (horas)</label><input id="p-tempo" type="number" step="0.5" placeholder="Ex: 2.5"></div>
                <div class="form-group"><label>Material Principal</label><select id="sel-m" class="w-full" style="padding:14px; border-radius:14px; border:2px solid #EDF2F7;">${mats}</select></div>
                <div class="form-group"><label>Qtd de Material usada</label><input id="sel-q" type="number" placeholder="Ex: 150"></div>
                <button type="submit" class="btn btn-primary w-full">Salvar na Nuvem</button>
            </form>
        `;
    } else if (type === 'sale') {
        t.innerText = "Registrar Venda";
        const prods = state.produtos.map(p => `<option value="${p.nome}" data-price="${p.preco_final}">${p.nome}</option>`).join('');
        const clis = state.clientes.map(c => `<option value="${c.nome}">${c.nome}</option>`).join('');
        b.innerHTML = `
            <form onsubmit="handleSaleSubmit(event)">
                <div class="form-group"><label>Produto</label><select id="v-prod" class="w-full" style="padding:14px; border-radius:14px; border:2px solid #EDF2F7;">${prods}</select></div>
                <div class="form-group"><label>Cliente</label><select id="v-cli" class="w-full" style="padding:14px; border-radius:14px; border:2px solid #EDF2F7;">${clis}</select></div>
                <div class="form-group"><label>Preço de Venda (R$)</label><input id="v-valor" type="number" step="0.01" placeholder="Ex: 45.00"></div>
                <button type="submit" class="btn btn-primary w-full">Finalizar Venda</button>
            </form>
        `;
    } else if (type === 'client') {
        t.innerText = "Novo Contato";
        b.innerHTML = `<form onsubmit="handleClientSubmit(event)">
            <div class="form-group"><label>Nome Completo</label><input id="cli-nome" placeholder="Nome do cliente"></div>
            <div class="form-group"><label>WhatsApp</label><input id="cli-whats" placeholder="(00) 00000-0000"></div>
            <button type="submit" class="btn btn-primary w-full">Salvar Contato</button>
        </form>`;
    } else if (type === 'cost') {
        t.innerText = "Novo Custo Fixo";
        b.innerHTML = `<form onsubmit="handleCostSubmit(event)">
            <div class="form-group"><label>Descrição</label><input id="c-nome" placeholder="Ex: Internet, Aluguel"></div>
            <div class="form-group"><label>Valor Mensal (R$)</label><input id="c-valor" type="number" step="0.01" placeholder="0.00"></div>
            <button type="submit" class="btn btn-primary w-full">Salvar Custo</button>
        </form>`;
    }
}

function closeModal() { document.getElementById('modal-container').classList.add('hidden'); }

// --- HANDLERS SUBMIT ---
async function handleMaterialSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
        const n = document.getElementById('m-nome').value;
        const t = document.getElementById('m-tipo').value;
        const q = Number(document.getElementById('m-quant').value);
        const u = document.getElementById('m-unid-compra').value;
        const p = Number(document.getElementById('m-preco').value);

        if (q <= 0) throw new Error("Quantidade deve ser maior que zero.");

        let pb = (t === 'massa') ? (u === 'kg' ? p / (q * 1000) : p / q) : (u === 'm' ? p / (q * 100) : p / q);
        if (t === 'unidade') pb = p / q;

        const { error } = await supabase.from('materiais_pro').insert({
            user_id: state.user.id, nome: n, tipo: t, preco_base: pb,
            unidade_base: (t === 'massa' ? 'g' : (t === 'comprimento' ? 'cm' : 'un'))
        });
        if (error) throw error;
        showToast("Material salvo com sucesso!", "success");
        await loadAllData(); closeModal();
    } catch (err) {
        showToast(err.message, "error");
    } finally {
        setLoading(false);
    }
}

async function handleProductSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
        const n = document.getElementById('p-nome').value;
        const t = Number(document.getElementById('p-tempo').value);
        const matId = document.getElementById('sel-m').value;
        const matQ = Number(document.getElementById('sel-q').value);
        const mat = state.materiais.find(m => m.id === matId);

        const custoMat = mat ? mat.preco_base * matQ : 0;
        const custoMo = t * state.config.valorHora;
        const preco = (custoMat + custoMo) * 1.30; // 30% lucro fixo

        const { error } = await supabase.from('produtos_pro').insert({
            user_id: state.user.id, nome: n, preco_final: preco, tempo_producao: t
        });
        if (error) throw error;
        showToast("Produto precificado e salvo!", "success");
        await loadAllData(); closeModal();
    } catch (err) {
        showToast(err.message, "error");
    } finally {
        setLoading(false);
    }
}

async function handleSaleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
        const { error } = await supabase.from('vendas_pro').insert({
            user_id: state.user.id,
            produto_nome: document.getElementById('v-prod').value,
            cliente_nome: document.getElementById('v-cli').value,
            valor: Number(document.getElementById('v-valor').value)
        });
        if (error) throw error;
        showToast("Venda registrada!", "success");
        await loadAllData(); closeModal();
    } catch (err) {
        showToast("Erro ao vender: " + err.message, "error");
    } finally {
        setLoading(false);
    }
}

async function handleClientSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
        const { error } = await supabase.from('clientes_pro').insert({
            user_id: state.user.id,
            nome: document.getElementById('cli-nome').value,
            whatsapp: document.getElementById('cli-whats').value
        });
        if (error) throw error;
        showToast("Contato salvo!", "success");
        await loadAllData(); closeModal();
    } catch (err) {
        showToast(err.message, "error");
    } finally {
        setLoading(false);
    }
}

async function handleCostSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
        const { error } = await supabase.from('custos_fixos_pro').insert({
            user_id: state.user.id,
            nome: document.getElementById('c-nome').value,
            valor: Number(document.getElementById('c-valor').value)
        });
        if (error) throw error;
        showToast("Custo mensal salvo!", "success");
        await loadAllData(); closeModal();
    } catch (err) {
        showToast(err.message, "error");
    } finally {
        setLoading(false);
    }
}

async function deleteItem(table, id) {
    if (!confirm("Remover permanentemente da nuvem?")) return;
    setLoading(true);
    try {
        const { error } = await supabase.from(table).delete().eq('id', id);
        if (error) throw error;
        showToast("Item removido.", "info");
        await loadAllData();
    } catch (err) {
        showToast("Erro ao deletar: " + err.message, "error");
    } finally {
        setLoading(false);
    }
}

// --- UTILITÁRIOS UI ---
function updateMatUnits() {
    const t = document.getElementById('m-tipo').value;
    const s = document.getElementById('m-unid-compra');
    if (t === 'massa') s.innerHTML = '<option value="kg">Quilos (Kg)</option><option value="g">Gramas (g)</option>';
    else if (t === 'comprimento') s.innerHTML = '<option value="m">Metros (m)</option><option value="cm">Centímetros (cm)</option>';
    else s.innerHTML = '<option value="un">Unidade (un)</option>';
}

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    const target = document.getElementById(id);
    if (target) target.classList.remove('hidden');
}

function setLoading(v) {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.classList.toggle('hidden', !v);
}
