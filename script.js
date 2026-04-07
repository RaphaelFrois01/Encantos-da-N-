/**
 * ENCANTOS DA NÊ - GESTÃO PRO v6.0
 * Módulos: Precificação + Gestão + Conversão de Unidades
 */

let state = {
    materiais: JSON.parse(localStorage.getItem("atelie_materiais")) || [],
    custosFixos: JSON.parse(localStorage.getItem("atelie_custos")) || [],
    produtos: JSON.parse(localStorage.getItem("atelie_produtos")) || [],
    clientes: JSON.parse(localStorage.getItem("atelie_clientes")) || [],
    vendas: JSON.parse(localStorage.getItem("atelie_vendas")) || [],
    config: JSON.parse(localStorage.getItem("atelie_config")) || {
        valorHora: 15.15,
        salarioDesejado: 2000,
        horasDia: 6,
        diasMes: 22,
        userName: "Raphael"
    },
    currentTab: 'inicio',
    currentSubTab: 'produtos'
};

document.addEventListener("DOMContentLoaded", () => {
    initLucide();
    switchTab('inicio');
    loadSettings();
});

function initLucide() { if (window.lucide) window.lucide.createIcons(); }

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
    if (context === 'precificar') {
        topNav.innerHTML = `
            <button class="top-tab-btn active" onclick="switchSubTab('produtos')">Produtos</button>
            <button class="top-tab-btn" onclick="switchSubTab('materiais')">Materiais</button>
            <button class="top-tab-btn" onclick="switchSubTab('custos')">Custos</button>
            <button class="top-tab-btn" onclick="switchSubTab('maodeobra')">Mão de Obra</button>
        `;
        if (!['produtos', 'materiais', 'custos', 'maodeobra'].includes(state.currentSubTab)) state.currentSubTab = 'produtos';
    } else if (context === 'gestao') {
        topNav.innerHTML = `
            <button class="top-tab-btn active" onclick="switchSubTab('vendas')">Vendas</button>
            <button class="top-tab-btn" onclick="switchSubTab('financeiro')">Financeiro</button>
            <button class="top-tab-btn" onclick="switchSubTab('estoque')">Estoque</button>
        `;
        if (!['vendas', 'financeiro', 'estoque'].includes(state.currentSubTab)) state.currentSubTab = 'vendas';
    }
    switchSubTab(state.currentSubTab);
}

function switchSubTab(subTabId) {
    state.currentSubTab = subTabId;
    document.querySelectorAll('.subtab-content').forEach(el => el.classList.add('hidden'));
    const target = document.getElementById(`subtab-${subTabId}`);
    if (target) target.classList.remove('hidden');

    document.querySelectorAll('.top-tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('onclick').includes(subTabId)) btn.classList.add('active');
    });
    renderAll();
}

// --- PERSISTÊNCIA ---
function saveState() {
    localStorage.setItem("atelie_materiais", JSON.stringify(state.materiais));
    localStorage.setItem("atelie_custos", JSON.stringify(state.custosFixos));
    localStorage.setItem("atelie_produtos", JSON.stringify(state.produtos));
    localStorage.setItem("atelie_clientes", JSON.stringify(state.clientes));
    localStorage.setItem("atelie_vendas", JSON.stringify(state.vendas));
    localStorage.setItem("atelie_config", JSON.stringify(state.config));
}

function loadSettings() {
    const cfg = state.config;
    if (document.getElementById('cfg-salario')) {
        document.getElementById('cfg-salario').value = cfg.salarioDesejado;
        document.getElementById('cfg-horas-dia').value = cfg.horasDia;
        document.getElementById('cfg-dias-mes').value = cfg.diasMes;
        calculateLabor();
    }
}

function calculateLabor() {
    const s = Number(document.getElementById('cfg-salario').value) || 0;
    const h = Number(document.getElementById('cfg-horas-dia').value) || 1;
    const d = Number(document.getElementById('cfg-dias-mes').value) || 1;
    const valorHora = s / (h * d);
    state.config = { ...state.config, salarioDesejado: s, horasDia: h, diasMes: d, valorHora: valorHora };
    document.getElementById('display-valor-hora').innerText = `R$ ${valorHora.toFixed(2).replace('.', ',')}`;
    saveState();
}

// --- RENDERIZADORES ---
function renderAll() {
    if (state.currentTab === 'inicio') renderHome();
    if (state.currentSubTab === 'produtos') renderProdutos();
    if (state.currentSubTab === 'materiais') renderMateriais();
    if (state.currentSubTab === 'custos') renderCustos();
    if (state.currentSubTab === 'maodeobra') loadSettings();
    if (state.currentSubTab === 'vendas') renderVendas();
    if (state.currentSubTab === 'financeiro') renderFinanceiro();
    if (state.currentSubTab === 'estoque') renderEstoque();
    if (state.currentTab === 'contatos') renderClientes();
    initLucide();
}

function renderHome() {
    let mesVendas = state.vendas.reduce((acc, v) => acc + v.valor, 0);
    let mesGastos = state.custosFixos.reduce((acc, c) => acc + c.valor, 0);
    document.getElementById('stat-vendas').innerText = `R$ ${mesVendas.toFixed(2)}`;
    document.getElementById('stat-gastos').innerText = `R$ ${mesGastos.toFixed(2)}`;
}

function renderMateriais() {
    const list = document.getElementById('lista-materiais');
    list.innerHTML = state.materiais.length === 0 ? '<p>Nenhum material.</p>' : state.materiais.map(m => `
        <div class="item-card">
            <div class="item-info"><h4>${m.nome}</h4><p>Custo: R$ ${m.preco_base.toFixed(4)} por ${m.unidade_base}</p></div>
            <button class="btn-text" onclick="deleteItem('materiais', ${m.id})" style="color:red">❌</button>
        </div>
    `).join('');
}

function renderCustos() {
    const list = document.getElementById('lista-custos');
    let total = 0;
    list.innerHTML = state.custosFixos.map(c => {
        total += c.valor;
        return `<div class="item-card"><h4>${c.nome}</h4><span class="val">R$ ${c.valor.toFixed(2)}</span><button onclick="deleteItem('custosFixos', ${c.id})" style="color:red; border:none; background:none">❌</button></div>`;
    }).join('');
    document.getElementById('total-custos-fixos').innerText = `R$ ${total.toFixed(2)}`;
}

function renderProdutos() {
    const list = document.getElementById('lista-produtos');
    list.innerHTML = state.produtos.map(p => `
        <div class="item-card">
            <div class="item-info"><h4>${p.nome}</h4><p>Venda: R$ ${p.preco_final.toFixed(2)}</p></div>
            <button class="btn-text" onclick="deleteItem('produtos', ${p.id})" style="color:red">❌</button>
        </div>
    `).join('');
}

function renderVendas() {
    const list = document.getElementById('lista-vendas');
    list.innerHTML = state.vendas.map(v => `<div class="item-card"><h4>${v.produtoNome}</h4><span class="text-green">R$ ${v.valor.toFixed(2)}</span></div>`).join('');
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
    list.innerHTML = state.materiais.map(m => `<div class="item-card"><h4>${m.nome}</h4></div>`).join('');
}

function renderClientes() {
    const list = document.getElementById('lista-clientes');
    list.innerHTML = state.clientes.map(c => `<div class="item-card"><h4>${c.nome}</h4></div>`).join('');
}

// --- MODAIS ---
function showModal(type) {
    const c = document.getElementById('modal-container');
    const t = document.getElementById('modal-title');
    const b = document.getElementById('modal-body');
    c.classList.remove('hidden');

    if (type === 'material') {
        t.innerText = "Novo Material";
        b.innerHTML = `
            <form onsubmit="handleMaterial(event)">
                <input id="m-nome" placeholder="Nome (ex: Barbante 6)" required>
                <label>Tipo de Medida</label>
                <select id="m-tipo" onchange="updateUnitOptions()">
                    <option value="massa">Peso (Kg/g)</option>
                    <option value="comprimento">Comprimento (m/cm)</option>
                    <option value="unidade">Unidade (un)</option>
                </select>
                <div style="display:flex; gap:10px">
                    <input id="m-quant" type="number" placeholder="Qtd. Embalagem" required>
                    <select id="m-unid-compra"></select>
                </div>
                <input id="m-preco" type="number" step="0.01" placeholder="Preço Pago (R$)" required>
                <button type="submit" class="btn btn-primary w-full">Salvar</button>
            </form>
        `;
        updateUnitOptions();
    } else if (type === 'cost') {
        t.innerText = "Novo Custo Fixo";
        b.innerHTML = `<form onsubmit="handleCost(event)"><input id="c-nome" placeholder="Descrição" required><input id="c-valor" type="number" step="0.01" placeholder="Valor Mensal" required><button type="submit" class="btn btn-primary w-full">Salvar</button></form>`;
    } else if (type === 'product') {
        t.innerText = "Novo Produto";
        const mats = state.materiais.map(m => `<option value="${m.id}">${m.nome}</option>`).join('');
        b.innerHTML = `
            <form onsubmit="handleProduct(event)">
                <input id="p-nome" placeholder="Nome do Produto" required>
                <input id="p-tempo" type="number" step="0.5" placeholder="Horas de Trabalho" required>
                <input id="p-lucro" type="number" value="30" placeholder="% Lucro">
                
                <h4 style="margin:15px 0 5px">Materiais Usados</h4>
                <div style="display:flex; gap:5px; margin-bottom:10px">
                    <select id="sel-m" style="flex:2">${mats}</select>
                    <input id="sel-q" type="number" placeholder="Qtd" style="flex:1">
                    <button type="button" class="btn btn-secondary" onclick="addMaterialToProduct()">+</button>
                </div>
                <ul id="p-materiais-list" class="text-small" style="margin-bottom:15px"></ul>
                <div id="p-preview" class="total-bar">R$ 0,00</div>
                <button type="submit" class="btn btn-primary w-full">Criar Produto</button>
            </form>
        `;
        window.tempMats = [];
    } else if (type === 'sale') {
        t.innerText = "Registrar Venda";
        const prods = state.produtos.map(p => `<option value="${p.id}" data-price="${p.preco_final}">${p.nome}</option>`).join('');
        const clis = state.clientes.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');
        b.innerHTML = `<form onsubmit="handleSale(event)"><select id="v-prod">${prods}</select><select id="v-cli">${clis}</select><input id="v-valor" type="number" step="0.01" required><button type="submit" class="btn btn-primary w-full">Concluir</button></form>`;
    } else if (type === 'client') {
        t.innerText = "Novo Contato";
        b.innerHTML = `<form onsubmit="handleClient(event)"><input id="cli-nome" placeholder="Nome" required><button type="submit" class="btn btn-primary w-full">Salvar</button></form>`;
    }
}

function closeModal() { document.getElementById('modal-container').classList.add('hidden'); }

// --- LOGICA DE MATERIAIS ---
function updateUnitOptions() {
    const tipo = document.getElementById('m-tipo').value;
    const sel = document.getElementById('m-unid-compra');
    if (tipo === 'massa') sel.innerHTML = '<option value="kg">Kg</option><option value="g">gramas</option>';
    else if (tipo === 'comprimento') sel.innerHTML = '<option value="m">metros</option><option value="cm">centímetros</option>';
    else sel.innerHTML = '<option value="un">unidades</option>';
}

function handleMaterial(e) {
    e.preventDefault();
    const nome = document.getElementById('m-nome').value;
    const tipo = document.getElementById('m-tipo').value;
    const q = Number(document.getElementById('m-quant').value);
    const u = document.getElementById('m-unid-compra').value;
    const p = Number(document.getElementById('m-preco').value);

    let precoBase = 0;
    let unidBase = "";

    if (tipo === 'massa') {
        unidBase = "g";
        precoBase = (u === 'kg') ? p / (q * 1000) : p / q;
    } else if (tipo === 'comprimento') {
        unidBase = "cm";
        precoBase = (u === 'm') ? p / (q * 100) : p / q;
    } else {
        unidBase = "un";
        precoBase = p / q;
    }

    state.materiais.push({ id: Date.now(), nome, tipo, preco_base: precoBase, unidade_base: unidBase });
    saveState(); renderAll(); closeModal();
}

// --- LOGICA DE PRODUTOS ---
function addMaterialToProduct() {
    const id = document.getElementById('sel-m').value;
    const q = Number(document.getElementById('sel-q').value);
    if (!id || q <= 0) return;
    const mat = state.materiais.find(m => m.id == id);
    window.tempMats.push({ id, nome: mat.nome, q, custo: mat.preco_base * q, un: mat.unidade_base });
    renderTempMats();
    updateProductPreview();
}

function renderTempMats() {
    document.getElementById('p-materiais-list').innerHTML = window.tempMats.map(m => `<li>${m.nome}: ${m.q}${m.un} (R$ ${m.custo.toFixed(2)})</li>`).join('');
}

function updateProductPreview() {
    const t = Number(document.getElementById('p-tempo').value) || 0;
    const l = Number(document.getElementById('p-lucro').value) || 0;
    const cMat = window.tempMats.reduce((a, b) => a + b.custo, 0);
    const total = (cMat + (t * state.config.valorHora)) * 1.15 * (1 + l / 100); // 15% fixo padrão fallback
    document.getElementById('p-preview').innerText = `R$ ${total.toFixed(2)}`;
    return total;
}

function handleProduct(e) {
    e.preventDefault();
    state.produtos.push({ id: Date.now(), nome: document.getElementById('p-nome').value, preco_final: updateProductPreview() });
    saveState(); renderAll(); closeModal();
}

// --- OUTROS HANDLERS ---
function handleCost(e) { /* ... similar previous ... */
    e.preventDefault();
    state.custosFixos.push({ id: Date.now(), nome: document.getElementById('c-nome').value, valor: Number(document.getElementById('c-valor').value) });
    saveState(); renderAll(); closeModal();
}
function handleSale(e) { /* ... similar previous ... */
    e.preventDefault();
    state.vendas.push({ id: Date.now(), produtoNome: document.getElementById('v-prod').options[document.getElementById('v-prod').selectedIndex].text, valor: Number(document.getElementById('v-valor').value) });
    saveState(); renderAll(); closeModal();
}
function handleClient(e) {
    e.preventDefault();
    state.clientes.push({ id: Date.now(), nome: document.getElementById('cli-nome').value });
    saveState(); renderAll(); closeModal();
}
function deleteItem(arr, id) { if (confirm("Remover?")) { state[arr] = state[arr].filter(i => i.id !== id); saveState(); renderAll(); } }
function exportData() { /* ... same ... */ }
function importData(inp) { /* ... same ... */ }
