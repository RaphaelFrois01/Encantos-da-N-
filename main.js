/**
 * ENCANTOS DA NÊ - GESTÃO LOCAL v10.0
 * 100% Offline | Dados salvos no aparelho | Sem login
 */

// ============================================================
// UTILITÁRIOS GLOBAIS
// ============================================================
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

function setLoading(v) {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.classList.toggle('hidden', !v);
}

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    const t = document.getElementById(id);
    if (t) t.classList.remove('hidden');
}

function initLucide() {
    if (window.lucide) window.lucide.createIcons();
}

function $(id) { return document.getElementById(id); }

// ============================================================
// ESTADO GLOBAL
// ============================================================
let state = {
    materiais: [],
    custosFixos: [],
    produtos: [],
    clientes: [],
    vendas: [],
    config: {
        userName: 'Ateliê',
        salarioDesejado: 2000,
        horasDia: 6,
        diasMes: 22,
        valorHora: 15.15
    },
    currentTab: 'inicio',
    currentSubTab: 'produtos'
};

// ============================================================
// PERSISTÊNCIA LOCAL
// ============================================================
const KEYS = {
    materiais: 'ne_materiais',
    custosFixos: 'ne_custos',
    produtos: 'ne_produtos',
    clientes: 'ne_clientes',
    vendas: 'ne_vendas',
    config: 'ne_config'
};

function saveState() {
    localStorage.setItem(KEYS.materiais, JSON.stringify(state.materiais));
    localStorage.setItem(KEYS.custosFixos, JSON.stringify(state.custosFixos));
    localStorage.setItem(KEYS.produtos, JSON.stringify(state.produtos));
    localStorage.setItem(KEYS.clientes, JSON.stringify(state.clientes));
    localStorage.setItem(KEYS.vendas, JSON.stringify(state.vendas));
    localStorage.setItem(KEYS.config, JSON.stringify(state.config));
}

function loadState() {
    state.materiais = JSON.parse(localStorage.getItem(KEYS.materiais) || '[]');
    state.custosFixos = JSON.parse(localStorage.getItem(KEYS.custosFixos) || '[]');
    state.produtos = JSON.parse(localStorage.getItem(KEYS.produtos) || '[]');
    state.clientes = JSON.parse(localStorage.getItem(KEYS.clientes) || '[]');
    state.vendas = JSON.parse(localStorage.getItem(KEYS.vendas) || '[]');
    const cfg = localStorage.getItem(KEYS.config);
    if (cfg) state.config = JSON.parse(cfg);
}

function addItem(key, item) {
    const newItem = { ...item, id: Date.now().toString() };
    state[key].unshift(newItem);
    saveState();
    return newItem;
}

function deleteItem(key, id) {
    state[key] = state[key].filter(i => i.id !== id);
    saveState();
}

// ============================================================
// BACKUP & RESTAURAR
// ============================================================
function exportData() {
    const backup = {
        version: '10.0',
        exportedAt: new Date().toISOString(),
        materiais: state.materiais,
        custosFixos: state.custosFixos,
        produtos: state.produtos,
        clientes: state.clientes,
        vendas: state.vendas,
        config: state.config
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
    a.href = url;
    a.download = `backup-encantos-da-ne-${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Backup baixado com sucesso!', 'success');
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (!data.version) throw new Error('Arquivo inválido.');
            state.materiais = data.materiais || [];
            state.custosFixos = data.custosFixos || [];
            state.produtos = data.produtos || [];
            state.clientes = data.clientes || [];
            state.vendas = data.vendas || [];
            state.config = data.config || state.config;
            saveState();
            renderAll();
            showToast('Backup restaurado com sucesso!', 'success');
        } catch (err) {
            showToast('Erro ao restaurar: arquivo inválido.', 'error');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

// ============================================================
// INICIALIZAÇÃO
// ============================================================
function initApp() {
    loadState();
    showScreen('app-screen');
    switchTab('inicio');
    initLucide();
    console.log('Encantos da Nê v10.0 iniciado.');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// ============================================================
// NAVEGAÇÃO
// ============================================================
function switchTab(tabId) {
    state.currentTab = tabId;
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    const tab = $(`tab-${tabId}`);
    if (tab) tab.classList.remove('hidden');

    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(btn => {
        if (btn.getAttribute('onclick')?.includes(`'${tabId}'`)) btn.classList.add('active');
    });

    const topNav = $('top-nav');
    if (tabId === 'precificar' || tabId === 'gestao') {
        topNav.classList.remove('hidden');
        renderTopTabs(tabId);
        if (tabId === 'precificar') switchSubTab('produtos');
        else switchSubTab('vendas');
    } else {
        topNav.classList.add('hidden');
    }

    if (tabId === 'ajustes') renderAjustes();
    renderAll();
}

function renderTopTabs(context) {
    const topNav = $('top-nav');
    const tabs = context === 'precificar'
        ? [{ id: 'produtos', label: 'Produtos' }, { id: 'materiais', label: 'Materiais' }, { id: 'custos', label: 'Custos' }, { id: 'maodeobra', label: 'Mão de Obra' }]
        : [{ id: 'vendas', label: 'Vendas' }, { id: 'financeiro', label: 'Financeiro' }, { id: 'estoque', label: 'Estoque' }];

    topNav.innerHTML = tabs.map(t => `
        <button class="top-tab-btn ${state.currentSubTab === t.id ? 'active' : ''}"
                onclick="switchSubTab('${t.id}')">${t.label}</button>
    `).join('');
}

function switchSubTab(subTabId) {
    state.currentSubTab = subTabId;
    document.querySelectorAll('.subtab-content').forEach(el => el.classList.add('hidden'));
    const target = $(`subtab-${subTabId}`);
    if (target) target.classList.remove('hidden');

    // Atualizar destaque no top nav
    document.querySelectorAll('.top-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('onclick')?.includes(`'${subTabId}'`));
    });
    renderAll();
}

// ============================================================
// RENDERIZAÇÃO
// ============================================================
function renderAll() {
    const display = $('user-name-display');
    if (display) display.innerText = state.config.userName;

    if (state.currentTab === 'inicio') renderHome();
    if (state.currentSubTab === 'produtos') renderProdutos();
    if (state.currentSubTab === 'materiais') renderMateriais();
    if (state.currentSubTab === 'custos') renderCustos();
    if (state.currentSubTab === 'maodeobra') renderMaodeobra();
    if (state.currentSubTab === 'vendas') renderVendas();
    if (state.currentSubTab === 'financeiro') renderFinanceiro();
    if (state.currentSubTab === 'estoque') renderEstoque();
    if (state.currentTab === 'contatos') renderClientes();
    initLucide();
}

function renderHome() {
    const mesVendas = state.vendas.reduce((acc, v) => acc + (v.valor || 0), 0);
    const mesGastos = state.custosFixos.reduce((acc, c) => acc + (c.valor || 0), 0);
    const el1 = $('stat-vendas');
    const el2 = $('stat-gastos');
    if (el1) el1.innerText = `R$ ${mesVendas.toFixed(2)}`;
    if (el2) el2.innerText = `R$ ${mesGastos.toFixed(2)}`;
}

function renderMateriais() {
    const list = $('lista-materiais');
    if (!list) return;
    list.innerHTML = state.materiais.length
        ? state.materiais.map(m => `
            <div class="item-card">
                <div class="item-info"><h4>${m.nome}</h4><p>R$ ${Number(m.preco_base).toFixed(4)}/${m.unidade_base}</p></div>
                <button onclick="handleDelete('materiais', '${m.id}')" style="color:red;background:none;border:none;font-size:1.3rem;cursor:pointer;">❌</button>
            </div>
        `).join('')
        : '<p style="text-align:center;padding:20px;color:#999">Nenhum material cadastrado.</p>';
}

function renderCustos() {
    const list = $('lista-custos');
    if (!list) return;
    let total = 0;
    list.innerHTML = state.custosFixos.length
        ? state.custosFixos.map(c => {
            total += c.valor || 0;
            return `<div class="item-card"><div class="item-info"><h4>${c.nome}</h4></div><span>R$ ${Number(c.valor).toFixed(2)}</span><button onclick="handleDelete('custosFixos', '${c.id}')" style="color:red;background:none;border:none;font-size:1.3rem;cursor:pointer;">❌</button></div>`;
        }).join('')
        : '<p style="text-align:center;padding:20px;color:#999">Nenhum custo fixo.</p>';
    const tot = $('total-custos-fixos');
    if (tot) tot.innerText = `R$ ${total.toFixed(2)}`;
}

function renderProdutos() {
    const list = $('lista-produtos');
    if (!list) return;
    list.innerHTML = state.produtos.length
        ? state.produtos.map(p => `
            <div class="item-card">
                <div class="item-info"><h4>${p.nome}</h4><p>R$ ${Number(p.preco_final).toFixed(2)}</p></div>
                <button onclick="handleDelete('produtos', '${p.id}')" style="color:red;background:none;border:none;font-size:1.3rem;cursor:pointer;">❌</button>
            </div>
        `).join('')
        : '<p style="text-align:center;padding:20px;color:#999">Nenhum produto cadastrado.</p>';
}

function renderVendas() {
    const list = $('lista-vendas');
    if (!list) return;
    list.innerHTML = state.vendas.length
        ? state.vendas.map(v => `
            <div class="item-card">
                <div class="item-info"><h4>${v.produto_nome}</h4><p>${v.cliente_nome || 'Cliente'}</p></div>
                <span class="text-green">R$ ${Number(v.valor).toFixed(2)}</span>
                <button onclick="handleDelete('vendas', '${v.id}')" style="color:red;background:none;border:none;font-size:1.3rem;cursor:pointer;">❌</button>
            </div>
        `).join('')
        : '<p style="text-align:center;padding:20px;color:#999">Nenhuma venda registrada.</p>';
}

function renderFinanceiro() {
    const entradas = state.vendas.reduce((acc, v) => acc + (v.valor || 0), 0);
    const saidas = state.custosFixos.reduce((acc, c) => acc + (c.valor || 0), 0);
    const e1 = $('fin-entradas'), e2 = $('fin-saidas'), e3 = $('fin-saldo');
    if (e1) e1.innerText = `R$ ${entradas.toFixed(2)}`;
    if (e2) e2.innerText = `R$ ${saidas.toFixed(2)}`;
    if (e3) e3.innerText = `R$ ${(entradas - saidas).toFixed(2)}`;
}

function renderEstoque() {
    const list = $('lista-estoque');
    if (!list) return;
    list.innerHTML = state.materiais.length
        ? state.materiais.map(m => `<div class="item-card"><h4>${m.nome}</h4><span>${m.tipo}</span></div>`).join('')
        : '<p style="text-align:center;padding:20px;color:#999">Nenhum material no estoque.</p>';
}

function renderClientes() {
    const list = $('lista-clientes');
    if (!list) return;
    list.innerHTML = state.clientes.length
        ? state.clientes.map(c => `
            <div class="item-card">
                <div class="item-info"><h4>${c.nome}</h4><p>${c.whatsapp || ''}</p></div>
                <button onclick="handleDelete('clientes', '${c.id}')" style="color:red;background:none;border:none;font-size:1.3rem;cursor:pointer;">❌</button>
            </div>
        `).join('')
        : '<p style="text-align:center;padding:20px;color:#999">Nenhum contato salvo.</p>';
}

function renderMaodeobra() {
    const s = $('cfg-salario'), h = $('cfg-horas-dia'), d = $('cfg-dias-mes'), v = $('display-valor-hora');
    if (s) s.value = state.config.salarioDesejado;
    if (h) h.value = state.config.horasDia;
    if (d) d.value = state.config.diasMes;
    if (v) v.innerText = `R$ ${state.config.valorHora.toFixed(2)}`;
}

function renderAjustes() {
    const nameInput = $('cfg-user-name');
    if (nameInput) nameInput.value = state.config.userName;
}

// ============================================================
// AÇÕES
// ============================================================
function handleDelete(key, id) {
    if (!confirm('Remover este item?')) return;
    deleteItem(key, id);
    renderAll();
    showToast('Item removido.', 'info');
}

function calculateLabor() {
    const s = Number($('cfg-salario')?.value) || 0;
    const h = Number($('cfg-horas-dia')?.value) || 1;
    const d = Number($('cfg-dias-mes')?.value) || 1;
    const vh = h * d > 0 ? s / (h * d) : 0;
    state.config = { ...state.config, salarioDesejado: s, horasDia: h, diasMes: d, valorHora: vh };
    const el = $('display-valor-hora');
    if (el) el.innerText = `R$ ${vh.toFixed(2)}`;
    saveState();
}

function updateUserName() {
    const name = $('cfg-user-name')?.value;
    if (!name) return;
    state.config.userName = name;
    const display = $('user-name-display');
    if (display) display.innerText = name;
    saveState();
    showToast('Nome atualizado!', 'success');
}

// ============================================================
// MODAIS
// ============================================================
function showModal(type) {
    const c = $('modal-container');
    const t = $('modal-title');
    const b = $('modal-body');
    if (!c || !t || !b) return;
    c.classList.remove('hidden');

    if (type === 'material') {
        t.innerText = 'Novo Material';
        b.innerHTML = `
            <form onsubmit="handleMaterialSubmit(event)">
                <div class="form-group"><label>Nome do Material</label><input id="m-nome" placeholder="Ex: Fio Amigurumi" required></div>
                <div class="form-group"><label>Tipo de Medida</label>
                    <select id="m-tipo" onchange="updateMatUnits()" class="w-full" style="padding:14px;border-radius:14px;border:2px solid #EDF2F7;">
                        <option value="massa">Peso (g/kg)</option>
                        <option value="comprimento">Comprimento (cm/m)</option>
                        <option value="unidade">Unidade</option>
                    </select>
                </div>
                <div style="display:flex;gap:10px" class="form-group">
                    <div style="flex:1"><label>Qtd Comprada</label><input id="m-quant" type="number" placeholder="Qtd" required></div>
                    <div style="flex:1"><label>Unidade</label><select id="m-unid-compra" class="w-full" style="padding:14px;border-radius:14px;border:2px solid #EDF2F7;"></select></div>
                </div>
                <div class="form-group"><label>Preço Pago (R$)</label><input id="m-preco" type="number" step="0.01" placeholder="Ex: 25.00" required></div>
                <button type="submit" class="btn btn-primary w-full">Salvar Material</button>
            </form>
        `;
        updateMatUnits();
    } else if (type === 'product') {
        t.innerText = 'Novo Produto';
        const mats = state.materiais.map(m => `<option value="${m.id}">${m.nome}</option>`).join('');
        b.innerHTML = `
            <form onsubmit="handleProductSubmit(event)">
                <div class="form-group"><label>Nome do Produto</label><input id="p-nome" placeholder="Ex: Polvo de Crochê" required></div>
                <div class="form-group"><label>Tempo de Produção (horas)</label><input id="p-tempo" type="number" step="0.5" placeholder="Ex: 2.5"></div>
                <div class="form-group"><label>Material Principal</label>
                    <select id="sel-m" class="w-full" style="padding:14px;border-radius:14px;border:2px solid #EDF2F7;">${mats || '<option>Nenhum material cadastrado</option>'}</select>
                </div>
                <div class="form-group"><label>Qtd de Material usada</label><input id="sel-q" type="number" placeholder="Ex: 150"></div>
                <button type="submit" class="btn btn-primary w-full">Calcular e Salvar</button>
            </form>
        `;
    } else if (type === 'sale') {
        t.innerText = 'Registrar Venda';
        const prods = state.produtos.map(p => `<option value="${p.nome}" data-price="${p.preco_final}">${p.nome}</option>`).join('');
        const clis = state.clientes.map(c => `<option value="${c.nome}">${c.nome}</option>`).join('');
        b.innerHTML = `
            <form onsubmit="handleSaleSubmit(event)">
                <div class="form-group"><label>Produto</label>
                    <select id="v-prod" class="w-full" style="padding:14px;border-radius:14px;border:2px solid #EDF2F7;">${prods || '<option>Nenhum produto cadastrado</option>'}</select>
                </div>
                <div class="form-group"><label>Cliente</label>
                    <select id="v-cli" class="w-full" style="padding:14px;border-radius:14px;border:2px solid #EDF2F7;">${clis || '<option value="">Sem cliente</option>'}</select>
                </div>
                <div class="form-group"><label>Valor de Venda (R$)</label><input id="v-valor" type="number" step="0.01" placeholder="Ex: 45.00" required></div>
                <button type="submit" class="btn btn-primary w-full">Finalizar Venda</button>
            </form>
        `;
    } else if (type === 'client') {
        t.innerText = 'Novo Contato';
        b.innerHTML = `
            <form onsubmit="handleClientSubmit(event)">
                <div class="form-group"><label>Nome Completo</label><input id="cli-nome" placeholder="Nome do cliente" required></div>
                <div class="form-group"><label>WhatsApp</label><input id="cli-whats" placeholder="(00) 00000-0000"></div>
                <button type="submit" class="btn btn-primary w-full">Salvar Contato</button>
            </form>
        `;
    } else if (type === 'cost') {
        t.innerText = 'Novo Custo Fixo';
        b.innerHTML = `
            <form onsubmit="handleCostSubmit(event)">
                <div class="form-group"><label>Descrição</label><input id="c-nome" placeholder="Ex: Internet, Aluguel" required></div>
                <div class="form-group"><label>Valor Mensal (R$)</label><input id="c-valor" type="number" step="0.01" placeholder="0.00" required></div>
                <button type="submit" class="btn btn-primary w-full">Salvar Custo</button>
            </form>
        `;
    }
}

function closeModal() {
    $('modal-container')?.classList.add('hidden');
}

// ============================================================
// HANDLERS DE FORMULÁRIOS
// ============================================================
function handleMaterialSubmit(e) {
    e.preventDefault();
    const n = $('m-nome').value;
    const tipo = $('m-tipo').value;
    const q = Number($('m-quant').value);
    const u = $('m-unid-compra').value;
    const p = Number($('m-preco').value);
    if (q <= 0) return showToast('Quantidade deve ser maior que zero.', 'warning');

    let pb;
    if (tipo === 'massa') pb = u === 'kg' ? p / (q * 1000) : p / q;
    else if (tipo === 'comprimento') pb = u === 'm' ? p / (q * 100) : p / q;
    else pb = p / q;

    const unidBase = tipo === 'massa' ? 'g' : tipo === 'comprimento' ? 'cm' : 'un';
    addItem('materiais', { nome: n, tipo, preco_base: pb, unidade_base: unidBase });
    showToast('Material salvo!', 'success');
    closeModal();
    renderMateriais();
}

function handleProductSubmit(e) {
    e.preventDefault();
    const n = $('p-nome').value;
    const tempo = Number($('p-tempo').value) || 0;
    const matId = $('sel-m')?.value;
    const matQ = Number($('sel-q')?.value) || 0;
    const mat = state.materiais.find(m => m.id === matId);
    const custoMat = mat ? mat.preco_base * matQ : 0;
    const custoMo = tempo * state.config.valorHora;
    const preco = (custoMat + custoMo) * 1.30;

    addItem('produtos', { nome: n, preco_final: preco, tempo_producao: tempo });
    showToast(`Produto salvo! Preço sugerido: R$ ${preco.toFixed(2)}`, 'success');
    closeModal();
    renderProdutos();
}

function handleSaleSubmit(e) {
    e.preventDefault();
    addItem('vendas', {
        produto_nome: $('v-prod').value,
        cliente_nome: $('v-cli')?.value || '',
        valor: Number($('v-valor').value)
    });
    showToast('Venda registrada!', 'success');
    closeModal();
    renderVendas();
    renderHome();
}

function handleClientSubmit(e) {
    e.preventDefault();
    addItem('clientes', {
        nome: $('cli-nome').value,
        whatsapp: $('cli-whats').value
    });
    showToast('Contato salvo!', 'success');
    closeModal();
    renderClientes();
}

function handleCostSubmit(e) {
    e.preventDefault();
    addItem('custosFixos', {
        nome: $('c-nome').value,
        valor: Number($('c-valor').value)
    });
    showToast('Custo salvo!', 'success');
    closeModal();
    renderCustos();
}

// ============================================================
// UTILITÁRIOS DE UI
// ============================================================
function updateMatUnits() {
    const t = $('m-tipo');
    const s = $('m-unid-compra');
    if (!t || !s) return;
    const val = t.value;
    if (val === 'massa') s.innerHTML = '<option value="kg">Quilos (kg)</option><option value="g">Gramas (g)</option>';
    else if (val === 'comprimento') s.innerHTML = '<option value="m">Metros (m)</option><option value="cm">Centímetros (cm)</option>';
    else s.innerHTML = '<option value="un">Unidade (un)</option>';
}
