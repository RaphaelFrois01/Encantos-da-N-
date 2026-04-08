/**
 * ENCANTOS DA NÊ - GESTÃO PRO CLOUD v7.0
 * Backend: Supabase Cloud Database
 */

// --- CONFIGURAÇÃO SUPABASE ---
const SB_URL = 'https://ahmuiepedgoqecfmszyf.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFobXVpZXBlZGdvcWVjZm1zenlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2MDY0NzMsImV4cCI6MjA5MTE4MjQ3M30.5GWr3Xq0MNPUDxq12cV6d0PboW7nP-RBDwYftBvAnA4';
let supabase;

// --- ESTADO GLOBAL ---
let state = {
    user: null,
    materiais: [],
    custosFixos: [],
    produtos: [],
    clientes: [],
    vendas: [],
    config: { valorHora: 15.15, salarioDesejado: 2000, horasDia: 6, diasMes: 22, userName: "Artesã" },
    currentTab: 'inicio',
    currentSubTab: 'produtos',
    authMode: 'login'
};

// --- INICIALIZAÇÃO ---
document.addEventListener("DOMContentLoaded", async () => {
    supabase = window.supabase.createClient(SB_URL, SB_KEY);
    setupAuthListeners();
    initLucide();
});

function initLucide() { if (window.lucide) window.lucide.createIcons(); }

// --- AUTENTICAÇÃO ---
function setupAuthListeners() {
    supabase.auth.onAuthStateChange(async (event, session) => {
        if (session) {
            state.user = session.user;
            showScreen('app-screen');
            await loadAllData();
            switchTab('inicio');
        } else {
            state.user = null;
            showScreen('auth-screen');
            renderAuthUI();
        }
    });

    document.getElementById('auth-form').onsubmit = handleAuthSubmit;
    document.getElementById('toggle-auth-mode').onclick = (e) => {
        e.preventDefault();
        state.authMode = state.authMode === 'login' ? 'signup' : 'login';
        renderAuthUI();
    };
}

async function handleAuthSubmit(e) {
    e.preventDefault();
    setLoading(true);
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const name = document.getElementById('auth-name').value;

    try {
        if (state.authMode === 'login') {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
        } else {
            const { error } = await supabase.auth.signUp({
                email, password, options: { data: { full_name: name || 'Artesã' } }
            });
            if (error) throw error;
            alert("Verifique seu e-mail para confirmar o cadastro!");
        }
    } catch (err) {
        alert("Erro na autenticação: " + err.message);
    } finally {
        setLoading(false);
    }
}

function renderAuthUI() {
    const isLogin = state.authMode === 'login';
    document.getElementById('auth-title').innerText = isLogin ? "Bem-vinda de volta!" : "Criar Conta Pro";
    document.getElementById('auth-subtitle').innerText = isLogin ? "Acesse sua conta para sincronizar." : "Cadastre-se para salvar na nuvem.";
    document.getElementById('auth-submit-btn').innerText = isLogin ? "Entrar" : "Cadastrar";
    document.getElementById('toggle-auth-mode').innerText = isLogin ? "Não tem conta? Cadastre-se" : "Já tem conta? Entrar";
    document.getElementById('name-group').style.display = isLogin ? 'none' : 'block';
}

async function handleLogout() {
    await supabase.auth.signOut();
}

// --- CARREGAMENTO DE DADOS ---
async function loadAllData() {
    setLoading(true);
    try {
        const [m, c, p, cli, v, cfg] = await Promise.all([
            supabase.from('materiais_pro').select('*'),
            supabase.from('custos_fixos_pro').select('*'),
            supabase.from('produtos_pro').select('*'),
            supabase.from('clientes_pro').select('*'),
            supabase.from('vendas_pro').select('*').order('created_at', { ascending: false }),
            supabase.from('config_pro').select('*').single()
        ]);

        state.materiais = m.data || [];
        state.custosFixos = c.data || [];
        state.produtos = p.data || [];
        state.clientes = cli.data || [];
        state.vendas = v.data || [];

        if (cfg.data) {
            state.config = {
                valorHora: cfg.data.valor_hora,
                salarioDesejado: cfg.data.salario_desejado,
                horasDia: cfg.data.horas_dia,
                diasMes: cfg.data.dias_mes,
                userName: cfg.data.user_name
            };
        } else {
            // Inicializar config se não existir
            await supabase.from('config_pro').insert({
                user_id: state.user.id,
                user_name: state.user.user_metadata.full_name || 'Artesã'
            });
        }

        renderAll();
    } catch (err) {
        console.error("Erro ao carregar dados:", err);
    } finally {
        setLoading(false);
    }
}

// --- NAVEGAÇÃO ---
function switchTab(tabId) {
    state.currentTab = tabId;
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.getElementById(`tab-${tabId}`).classList.remove('hidden');

    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = Array.from(document.querySelectorAll('.nav-btn')).find(b => b.getAttribute('onclick').includes(tabId));
    if (activeBtn) activeBtn.classList.add('active');

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

    topNav.innerHTML = tabs.map(t => `<button class="top-tab-btn ${state.currentSubTab === t ? 'active' : ''}" onclick="switchSubTab('${t}')">${t.charAt(0).toUpperCase() + t.slice(1)}</button>`).join('');
}

function switchSubTab(subTabId) {
    state.currentSubTab = subTabId;
    document.querySelectorAll('.subtab-content').forEach(el => el.classList.add('hidden'));
    const target = document.getElementById(`subtab-${subTabId}`);
    if (target) target.classList.remove('hidden');
    renderAll();
}

// --- RENDERIZADORES ---
function renderAll() {
    document.getElementById('user-name-display').innerText = state.config.userName;
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
    list.innerHTML = state.materiais.map(m => `
        <div class="item-card">
            <div class="item-info"><h4>${m.nome}</h4><p>R$ ${m.preco_base.toFixed(4)}/${m.unidade_base}</p></div>
            <button class="btn-text" onclick="deleteItem('materiais_pro', '${m.id}')" style="color:red">❌</button>
        </div>
    `).join('');
}

function renderCustos() {
    const list = document.getElementById('lista-custos');
    let total = 0;
    list.innerHTML = state.custosFixos.map(c => {
        total += c.valor;
        return `<div class="item-card"><h4>${c.nome}</h4><span class="val">R$ ${c.valor.toFixed(2)}</span><button onclick="deleteItem('custos_fixos_pro', '${c.id}')" style="color:red; background:none; border:none">❌</button></div>`;
    }).join('');
    document.getElementById('total-custos-fixos').innerText = `R$ ${total.toFixed(2)}`;
}

function renderProdutos() {
    const list = document.getElementById('lista-produtos');
    list.innerHTML = state.produtos.map(p => `
        <div class="item-card">
            <div class="item-info"><h4>${p.nome}</h4><p>R$ ${p.preco_final.toFixed(2)}</p></div>
            <button class="btn-text" onclick="deleteItem('produtos_pro', '${p.id}')" style="color:red">❌</button>
        </div>
    `).join('');
}

function renderVendas() {
    const list = document.getElementById('lista-vendas');
    list.innerHTML = state.vendas.map(v => `
        <div class="item-card">
            <div class="item-info"><h4>${v.produto_nome}</h4><p>${v.cliente_nome || 'Cliente'}</p></div>
            <span class="text-green">R$ ${v.valor.toFixed(2)}</span>
            <button class="btn-text" onclick="deleteItem('vendas_pro', '${v.id}')" style="color:red">❌</button>
        </div>
    `).join('');
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
    list.innerHTML = state.materiais.map(m => `<div class="item-card"><h4>${m.nome}</h4><span>Sincronizado Cloud</span></div>`).join('');
}

function renderClientes() {
    const list = document.getElementById('lista-clientes');
    list.innerHTML = state.clientes.map(c => `<div class="item-card"><h4>${c.nome}</h4><button onclick="deleteItem('clientes_pro', '${c.id}')" style="color:red; background:none; border:none">❌</button></div>`).join('');
}

function renderMaodeobraUI() {
    document.getElementById('cfg-salario').value = state.config.salarioDesejado;
    document.getElementById('cfg-horas-dia').value = state.config.horasDia;
    document.getElementById('cfg-dias-mes').value = state.config.diasMes;
    document.getElementById('display-valor-hora').innerText = `R$ ${state.config.valorHora.toFixed(2)}`;
}

// --- ACTIONS / CRUD ---
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
    state.config.userName = name;
    document.getElementById('user-name-display').innerText = name;
    await supabase.from('config_pro').upsert({ user_id: state.user.id, user_name: name });
}

// --- MODAIS ---
function showModal(type) {
    const c = document.getElementById('modal-container');
    const t = document.getElementById('modal-title');
    const b = document.getElementById('modal-body');
    c.classList.remove('hidden');

    if (type === 'material') {
        t.innerText = "Novo Material Cloud";
        b.innerHTML = `
            <form onsubmit="handleMaterialSubmit(event)">
                <input id="m-nome" placeholder="Nome" required>
                <select id="m-tipo" onchange="updateMatUnits()"><option value="massa">Peso</option><option value="comprimento">Comprimento</option><option value="unidade">Unid</option></select>
                <div style="display:flex; gap:10px"><input id="m-quant" type="number" placeholder="Qtd"><select id="m-unid-compra"></select></div>
                <input id="m-preco" type="number" step="0.01" placeholder="Preço (R$)">
                <button type="submit" class="btn btn-primary w-full">Salvar na Nuvem</button>
            </form>
        `;
        updateMatUnits();
    } else if (type === 'product') {
        t.innerText = "Novo Produto Cloud";
        const mats = state.materiais.map(m => `<option value="${m.id}">${m.nome}</option>`).join('');
        b.innerHTML = `
            <form onsubmit="handleProductSubmit(event)">
                <input id="p-nome" placeholder="Nome do Produto" required>
                <input id="p-tempo" type="number" step="0.5" placeholder="Horas">
                <select id="sel-m">${mats}</select>
                <input id="sel-q" type="number" placeholder="Qtd usada">
                <button type="submit" class="btn btn-primary w-full">Salvar na Nuvem</button>
            </form>
        `;
    } else if (type === 'sale') {
        t.innerText = "Registrar Venda";
        const prods = state.produtos.map(p => `<option value="${p.nome}" data-price="${p.preco_final}">${p.nome}</option>`).join('');
        const clis = state.clientes.map(c => `<option value="${c.nome}">${c.nome}</option>`).join('');
        b.innerHTML = `
            <form onsubmit="handleSaleSubmit(event)">
                <select id="v-prod">${prods}</select>
                <select id="v-cli">${clis}</select>
                <input id="v-valor" type="number" step="0.01" placeholder="Valor">
                <button type="submit" class="btn btn-primary w-full">Finalizar</button>
            </form>
        `;
    } else if (type === 'client') {
        t.innerText = "Novo Contato";
        b.innerHTML = `<form onsubmit="handleClientSubmit(event)"><input id="cli-nome" placeholder="Nome"><input id="cli-whats" placeholder="Whats"><button type="submit" class="btn btn-primary w-full">Salvar</button></form>`;
    } else if (type === 'cost') {
        t.innerText = "Novo Custo Fixo";
        b.innerHTML = `<form onsubmit="handleCostSubmit(event)"><input id="c-nome" placeholder="Descrição"><input id="c-valor" type="number" step="0.01" placeholder="Valor"><button type="submit" class="btn btn-primary w-full">Salvar</button></form>`;
    }
}

function closeModal() { document.getElementById('modal-container').classList.add('hidden'); }

// --- HANDLERS CLOUD ---
async function handleMaterialSubmit(e) {
    e.preventDefault();
    setLoading(true);
    const n = document.getElementById('m-nome').value;
    const t = document.getElementById('m-tipo').value;
    const q = Number(document.getElementById('m-quant').value);
    const u = document.getElementById('m-unid-compra').value;
    const p = Number(document.getElementById('m-preco').value);

    let pb = (t === 'massa') ? (u === 'kg' ? p / (q * 1000) : p / q) : (u === 'm' ? p / (q * 100) : p / q);
    if (t === 'unidade') pb = p / q;

    await supabase.from('materiais_pro').insert({
        user_id: state.user.id, nome: n, tipo: t, preco_base: pb, unidade_base: (t === 'massa' ? 'g' : (t === 'comprimento' ? 'cm' : 'un'))
    });
    await loadAllData(); closeModal();
}

async function handleProductSubmit(e) {
    e.preventDefault();
    setLoading(true);
    const n = document.getElementById('p-nome').value;
    const t = Number(document.getElementById('p-tempo').value);
    const matId = document.getElementById('sel-m').value;
    const matQ = Number(document.getElementById('sel-q').value);
    const mat = state.materiais.find(m => m.id === matId);
    const preco = ((mat ? mat.preco_base * matQ : 0) + (t * state.config.valorHora)) * 1.30;

    await supabase.from('produtos_pro').insert({ user_id: state.user.id, nome: n, preco_final: preco, tempo_producao: t });
    await loadAllData(); closeModal();
}

async function handleSaleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    await supabase.from('vendas_pro').insert({
        user_id: state.user.id,
        produto_nome: document.getElementById('v-prod').value,
        cliente_nome: document.getElementById('v-cli').value,
        valor: Number(document.getElementById('v-valor').value)
    });
    await loadAllData(); closeModal();
}

async function handleClientSubmit(e) {
    e.preventDefault();
    setLoading(true);
    await supabase.from('clientes_pro').insert({
        user_id: state.user.id, nome: document.getElementById('cli-nome').value, whatsapp: document.getElementById('cli-whats').value
    });
    await loadAllData(); closeModal();
}

async function handleCostSubmit(e) {
    e.preventDefault();
    setLoading(true);
    await supabase.from('custos_fixos_pro').insert({
        user_id: state.user.id, nome: document.getElementById('c-nome').value, valor: Number(document.getElementById('c-valor').value)
    });
    await loadAllData(); closeModal();
}

async function deleteItem(table, id) {
    if (!confirm("Remover da nuvem definitivamente?")) return;
    setLoading(true);
    await supabase.from(table).delete().eq('id', id);
    await loadAllData();
}

// --- UTIL ---
function updateMatUnits() {
    const t = document.getElementById('m-tipo').value;
    const s = document.getElementById('m-unid-compra');
    if (t === 'massa') s.innerHTML = '<option value="kg">Kg</option><option value="g">g</option>';
    else if (t === 'comprimento') s.innerHTML = '<option value="m">m</option><option value="cm">cm</option>';
    else s.innerHTML = '<option value="un">un</option>';
}

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
}

function setLoading(v) {
    document.getElementById('loading-overlay').classList.toggle('hidden', !v);
}
