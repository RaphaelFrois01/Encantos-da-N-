/**
 * ENCANTOS DA NÊ - HANDLERS MODULE
 * Handlers de formulários com validação robusta
 */

// ============================================================
// VALIDAÇÃO
// ============================================================
function validateRequired(value, fieldName) {
  if (!value || (typeof value === 'string' && !value.trim())) {
    showToast(`${fieldName} é obrigatório.`, 'warning');
    return false;
  }
  return true;
}

function validatePositiveNumber(value, fieldName) {
  const num = Number(value);
  if (isNaN(num) || num <= 0) {
    showToast(`${fieldName} deve ser um número positivo.`, 'warning');
    return false;
  }
  return true;
}

function validateNonNegativeNumber(value, fieldName) {
  const num = Number(value);
  if (isNaN(num) || num < 0) {
    showToast(`${fieldName} deve ser um número válido.`, 'warning');
    return false;
  }
  return true;
}

// ============================================================
// FORM HANDLERS
// ============================================================
function handleMaterialSubmit(e) {
  e.preventDefault();
  const nome = $('m-nome').value.trim();
  const tipo = $('m-tipo').value;
  const quant = $('m-quant').value;
  const unidade = $('m-unid-compra').value;
  const preco = $('m-preco').value;

  if (!validateRequired(nome, 'Nome')) return;
  if (!validatePositiveNumber(quant, 'Quantidade')) return;
  if (!validatePositiveNumber(preco, 'Preço')) return;

  const q = Number(quant);
  const p = Number(preco);
  let pb;
  if (tipo === 'massa') pb = unidade === 'kg' ? p / (q * 1000) : p / q;
  else if (tipo === 'comprimento') pb = unidade === 'm' ? p / (q * 100) : p / q;
  else pb = p / q;

  const unidBase = tipo === 'massa' ? 'g' : tipo === 'comprimento' ? 'cm' : 'un';
  addItem('materiais', { nome, tipo, preco_base: pb, unidade_base: unidBase });
  showToast('Material salvo!', 'success');
  closeModal();
  renderMateriais();
}

function handleProductSubmit(e) {
  e.preventDefault();
  const nome = $('p-nome').value.trim();
  const tempo = $('p-tempo').value;
  const matId = $('sel-m')?.value;
  const matQ = $('sel-q')?.value;

  if (!validateRequired(nome, 'Nome')) return;
  if (!validatePositiveNumber(tempo, 'Tempo de produção')) return;
  if (!validateNonNegativeNumber(matQ, 'Quantidade de material')) return;

  const s = getState();
  const t = Number(tempo);
  const mq = Number(matQ);
  const mat = s.materiais.find(m => m.id === matId);
  const custoMat = mat ? mat.preco_base * mq : 0;
  const custoMo = t * s.config.valorHora;
  const preco = (custoMat + custoMo) * 1.30;

  addItem('produtos', { nome, preco_final: preco, tempo_producao: t });
  showToast(`Produto salvo! Preço sugerido: R$ ${preco.toFixed(2)}`, 'success');
  closeModal();
  renderProdutos();
}

function handleSaleSubmit(e) {
  e.preventDefault();
  const prodNome = $('v-prod').value;
  const cliNome = $('v-cli')?.value || '';
  const valor = $('v-valor').value;

  if (!validateRequired(prodNome, 'Produto')) return;
  if (!validatePositiveNumber(valor, 'Valor')) return;

  addItem('vendas', {
    produto_nome: prodNome,
    cliente_nome: cliNome,
    valor: Number(valor)
  });
  showToast('Venda registrada!', 'success');
  closeModal();
  renderVendas();
  renderHome();
}

function handleClientSubmit(e) {
  e.preventDefault();
  const nome = $('cli-nome').value.trim();
  const whats = $('cli-whats').value.trim();

  if (!validateRequired(nome, 'Nome')) return;

  addItem('clientes', { nome, whatsapp: whats });
  showToast('Contato salvo!', 'success');
  closeModal();
  renderClientes();
}

function handleCostSubmit(e) {
  e.preventDefault();
  const nome = $('c-nome').value.trim();
  const valor = $('c-valor').value;

  if (!validateRequired(nome, 'Descrição')) return;
  if (!validatePositiveNumber(valor, 'Valor')) return;

  addItem('custosFixos', { nome, valor: Number(valor) });
  showToast('Custo salvo!', 'success');
  closeModal();
  renderCustos();
}

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

  if (!validatePositiveNumber(s, 'Salário')) return;
  if (!validatePositiveNumber(h, 'Horas/dia')) return;
  if (!validatePositiveNumber(d, 'Dias/mês')) return;

  const vh = h * d > 0 ? s / (h * d) : 0;
  updateConfig({ salarioDesejado: s, horasDia: h, diasMes: d, valorHora: vh });
  const el = $('display-valor-hora');
  if (el) el.textContent = `R$ ${vh.toFixed(2)}`;
}

function updateUserName() {
  const name = $('cfg-user-name')?.value?.trim();
  if (!validateRequired(name, 'Nome')) return;
  updateConfig({ userName: name });
  const display = $('user-name-display');
  if (display) display.textContent = name;
  showToast('Nome atualizado!', 'success');
}

// ============================================================
// NAVEGAÇÃO
// ============================================================
function switchTab(tabId) {
  setState(s => ({ ...s, currentTab: tabId }));

  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('is-hidden'));
  const tab = $(`tab-${tabId}`);
  if (tab) tab.classList.remove('is-hidden');

  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(btn => {
    if (btn.getAttribute('onclick')?.includes(`'${tabId}'`)) btn.classList.add('active');
  });

  const topNav = $('top-nav');
  if (tabId === 'precificar' || tabId === 'gestao') {
    topNav.classList.remove('is-hidden');
    renderTopTabs(tabId);
    if (tabId === 'precificar') switchSubTab('produtos');
    else switchSubTab('vendas');
  } else {
    topNav.classList.add('is-hidden');
  }

  if (tabId === 'ajustes') renderAjustes();
  renderAll();
}

function renderTopTabs(context) {
  const topNav = $('top-nav');
  const tabs = context === 'precificar'
    ? [{ id: 'produtos', label: 'Produtos' }, { id: 'materiais', label: 'Materiais' }, { id: 'custos', label: 'Custos' }, { id: 'maodeobra', label: 'Mão de Obra' }]
    : [{ id: 'vendas', label: 'Vendas' }, { id: 'financeiro', label: 'Financeiro' }, { id: 'estoque', label: 'Estoque' }];

  topNav.innerHTML = '';
  tabs.forEach(t => {
    const btn = document.createElement('button');
    btn.className = 'top-tab-btn';
    btn.textContent = t.label;
    btn.onclick = () => switchSubTab(t.id);
    topNav.appendChild(btn);
  });
}

function switchSubTab(subTabId) {
  setState(s => ({ ...s, currentSubTab: subTabId }));
  document.querySelectorAll('.subtab-content').forEach(el => el.classList.add('is-hidden'));
  const target = $(`subtab-${subTabId}`);
  if (target) target.classList.remove('is-hidden');

  document.querySelectorAll('.top-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.textContent.toLowerCase().includes(subTabId.substring(0, 4)));
  });
  renderAll();
}

// ============================================================
// UTILITÁRIOS DE UI
// ============================================================
function updateMatUnits() {
  const t = $('m-tipo');
  const s = $('m-unid-compra');
  if (!t || !s) return;
  s.innerHTML = '';
  const val = t.value;
  if (val === 'massa') {
    s.innerHTML = '<option value="kg">Quilos (kg)</option><option value="g">Gramas (g)</option>';
  } else if (val === 'comprimento') {
    s.innerHTML = '<option value="m">Metros (m)</option><option value="cm">Centímetros (cm)</option>';
  } else {
    s.innerHTML = '<option value="un">Unidades</option>';
  }
}

// ============================================================
// UTILITÁRIOS GLOBAIS
// ============================================================
function showToast(message, type = 'info', duration = 4000) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const content = document.createElement('span');
  content.className = 'toast-content';
  content.textContent = message; // textContent = seguro
  toast.appendChild(content);
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

function setLoading(v) {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) overlay.classList.toggle('is-hidden', !v);
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.add('is-hidden'));
  const t = document.getElementById(id);
  if (t) t.classList.remove('is-hidden');
}

function initLucide() {
  if (window.lucide) window.lucide.createIcons();
}

function $(id) { return document.getElementById(id); }

// ============================================================
// INICIALIZAÇÃO
// ============================================================
function initApp() {
  loadState();
  showScreen('app-screen');
  switchTab('inicio');
  initLucide();
  console.log('Encantos da Nê v10.1 iniciado.');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
