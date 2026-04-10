/**
 * ENCANTOS DA NÊ - RENDER MODULE
 * Renderização segura (sem innerHTML com dados do usuário)
 */

// Helper: escapa HTML para prevenir XSS
function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Helper: cria elemento com texto seguro
function createEl(tag, attrs = {}, textContent = '') {
  const el = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === 'className') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else el.setAttribute(k, v);
  });
  if (textContent) el.textContent = textContent;
  return el;
}

// Helper: cria item-card padronizado
function createItemCard(title, subtitle, value, onDelete) {
  const card = createEl('div', { className: 'item-card' });

  const info = createEl('div', { className: 'item-info' });
  info.appendChild(createEl('h4', {}, title));
  if (subtitle) info.appendChild(createEl('p', {}, subtitle));
  card.appendChild(info);

  const right = createEl('div', { className: 'item-price' });
  if (value !== null) {
    right.appendChild(createEl('span', { className: 'val' }, value));
  }
  if (onDelete) {
    const btn = createEl('button', {
      className: 'btn btn-delete',
      onClick: onDelete
    }, '❌');
    right.appendChild(btn);
  }
  card.appendChild(right);
  return card;
}

function createEmptyMessage(text) {
  const div = createEl('div', { className: 'card' });
  const p = createEl('p', { style: 'text-align:center;color:var(--text-muted)' }, text);
  div.appendChild(p);
  return div;
}

// ============================================================
// RENDER FUNCTIONS (renderizam apenas seu componente)
// ============================================================

function renderHome() {
  const s = getState();
  const mesVendas = s.vendas.reduce((acc, v) => acc + (v.valor || 0), 0);
  const mesGastos = s.custosFixos.reduce((acc, c) => acc + (c.valor || 0), 0);
  const el1 = $('stat-vendas');
  const el2 = $('stat-gastos');
  if (el1) el1.textContent = `R$ ${mesVendas.toFixed(2)}`;
  if (el2) el2.textContent = `R$ ${mesGastos.toFixed(2)}`;
}

function renderMateriais() {
  const list = $('lista-materiais');
  if (!list) return;
  list.innerHTML = '';
  const s = getState();
  if (!s.materiais.length) {
    list.appendChild(createEmptyMessage('Nenhum material cadastrado.'));
    return;
  }
  s.materiais.forEach(m => {
    list.appendChild(createItemCard(
      m.nome,
      `R$ ${Number(m.preco_base).toFixed(4)}/${m.unidade_base}`,
      null,
      () => handleDelete('materiais', m.id)
    ));
  });
}

function renderCustos() {
  const list = $('lista-custos');
  if (!list) return;
  list.innerHTML = '';
  const s = getState();
  let total = 0;
  if (!s.custosFixos.length) {
    list.appendChild(createEmptyMessage('Nenhum custo fixo.'));
  } else {
    s.custosFixos.forEach(c => {
      total += c.valor || 0;
      list.appendChild(createItemCard(
        c.nome,
        null,
        `R$ ${Number(c.valor).toFixed(2)}`,
        () => handleDelete('custosFixos', c.id)
      ));
    });
  }
  const tot = $('total-custos-fixos');
  if (tot) tot.textContent = `R$ ${total.toFixed(2)}`;
}

function renderProdutos() {
  const list = $('lista-produtos');
  if (!list) return;
  list.innerHTML = '';
  const s = getState();
  if (!s.produtos.length) {
    list.appendChild(createEmptyMessage('Nenhum produto cadastrado.'));
    return;
  }
  s.produtos.forEach(p => {
    list.appendChild(createItemCard(
      p.nome,
      null,
      `R$ ${Number(p.preco_final).toFixed(2)}`,
      () => handleDelete('produtos', p.id)
    ));
  });
}

function renderVendas() {
  const list = $('lista-vendas');
  if (!list) return;
  list.innerHTML = '';
  const s = getState();
  if (!s.vendas.length) {
    list.appendChild(createEmptyMessage('Nenhuma venda registrada.'));
    return;
  }
  s.vendas.forEach(v => {
    list.appendChild(createItemCard(
      v.produto_nome,
      v.cliente_nome || 'Cliente',
      `R$ ${Number(v.valor).toFixed(2)}`,
      () => handleDelete('vendas', v.id)
    ));
  });
}

function renderFinanceiro() {
  const s = getState();
  const entradas = s.vendas.reduce((acc, v) => acc + (v.valor || 0), 0);
  const saidas = s.custosFixos.reduce((acc, c) => acc + (c.valor || 0), 0);
  const e1 = $('fin-entradas'), e2 = $('fin-saidas'), e3 = $('fin-saldo');
  if (e1) e1.textContent = `R$ ${entradas.toFixed(2)}`;
  if (e2) e2.textContent = `R$ ${saidas.toFixed(2)}`;
  if (e3) e3.textContent = `R$ ${(entradas - saidas).toFixed(2)}`;
}

function renderEstoque() {
  const list = $('lista-estoque');
  if (!list) return;
  list.innerHTML = '';
  const s = getState();
  if (!s.materiais.length) {
    list.appendChild(createEmptyMessage('Nenhum material no estoque.'));
    return;
  }
  s.materiais.forEach(m => {
    list.appendChild(createItemCard(m.nome, m.tipo, null, null));
  });
}

function renderClientes() {
  const list = $('lista-clientes');
  if (!list) return;
  list.innerHTML = '';
  const s = getState();
  if (!s.clientes.length) {
    list.appendChild(createEmptyMessage('Nenhum contato salvo.'));
    return;
  }
  s.clientes.forEach(c => {
    list.appendChild(createItemCard(
      c.nome,
      c.whatsapp || '',
      null,
      () => handleDelete('clientes', c.id)
    ));
  });
}

function renderMaodeobra() {
  const s = getState();
  const sv = $('cfg-salario'), h = $('cfg-horas-dia'), d = $('cfg-dias-mes'), v = $('display-valor-hora');
  if (sv) sv.value = s.config.salarioDesejado;
  if (h) h.value = s.config.horasDia;
  if (d) d.value = s.config.diasMes;
  if (v) v.textContent = `R$ ${s.config.valorHora.toFixed(2)}`;
}

function renderAjustes() {
  const s = getState();
  const nameInput = $('cfg-user-name');
  if (nameInput) nameInput.value = s.config.userName;
}

// Renderiza apenas os componentes necessários para a aba atual
function renderAll() {
  const s = getState();
  const display = $('user-name-display');
  if (display) display.textContent = s.config.userName;

  // Renderiza apenas o que está visível
  const tab = s.currentTab;
  const subTab = s.currentSubTab;

  if (tab === 'inicio') renderHome();
  if (tab === 'contatos') renderClientes();
  if (tab === 'ajustes') renderAjustes();

  // Sub-tabs (renderiza apenas a ativa)
  const subRenderers = {
    produtos: renderProdutos,
    materiais: renderMateriais,
    custos: renderCustos,
    maodeobra: renderMaodeobra,
    vendas: renderVendas,
    financeiro: renderFinanceiro,
    estoque: renderEstoque
  };

  if (subRenderers[subTab]) subRenderers[subTab]();
  initLucide();
}
