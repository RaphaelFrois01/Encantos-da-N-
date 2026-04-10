/**
 * ENCANTOS DA NÊ - MODALS MODULE
 * Criação segura de modais via DOM API (sem innerHTML com dados do usuário)
 */

function showModal(type) {
  const c = $('modal-container');
  const t = $('modal-title');
  const b = $('modal-body');
  if (!c || !t || !b) return;
  c.classList.remove('is-hidden');

  b.innerHTML = ''; // limpa conteúdo anterior

  if (type === 'material') {
    t.textContent = 'Novo Material';
    // Formulário é estrutura fixa (sem dados do usuário), innerHTML é seguro aqui
    b.innerHTML = `
      <form onsubmit="handleMaterialSubmit(event)">
        <div class="form-group"><label>Nome do Material</label><input id="m-nome" required maxlength="100"></div>
        <div class="form-group"><label>Tipo de Medida</label>
          <select id="m-tipo" onchange="updateMatUnits()">
            <option value="massa">Peso (g/kg)</option>
            <option value="comprimento">Comprimento (cm/m)</option>
            <option value="unidade">Unidade</option>
          </select>
        </div>
        <div class="form-group"><label>Qtd Comprada</label><input id="m-quant" type="number" step="any" min="0.01" required></div>
        <div class="form-group"><label>Unidade</label>
          <select id="m-unid-compra"><option value="kg">Quilos (kg)</option><option value="g">Gramas (g)</option></select>
        </div>
        <div class="form-group"><label>Preço Pago (R$)</label><input id="m-preco" type="number" step="0.01" min="0.01" required></div>
        <button type="submit" class="btn btn-primary w-full">Salvar Material</button>
      </form>`;
    updateMatUnits();

  } else if (type === 'product') {
    t.textContent = 'Novo Produto';
    const s = getState();
    const form = document.createElement('form');
    form.setAttribute('onsubmit', 'handleProductSubmit(event)');
    form.innerHTML = `
      <div class="form-group"><label>Nome do Produto</label><input id="p-nome" required maxlength="100"></div>
      <div class="form-group"><label>Tempo de Produção (horas)</label><input id="p-tempo" type="number" step="0.1" min="0.1" required></div>
      <div class="form-group"><label>Material Principal</label><select id="sel-m"></select></div>
      <div class="form-group"><label>Qtd de Material usada</label><input id="sel-q" type="number" step="any" min="0" required></div>
      <button type="submit" class="btn btn-primary w-full">Calcular e Salvar</button>`;
    // Popula select com textContent seguro
    const sel = form.querySelector('#sel-m');
    if (!s.materiais.length) {
      const opt = document.createElement('option');
      opt.textContent = 'Nenhum material cadastrado';
      opt.disabled = true;
      sel.appendChild(opt);
    } else {
      s.materiais.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.textContent = m.nome; // textContent = seguro contra XSS
        sel.appendChild(opt);
      });
    }
    b.appendChild(form);

  } else if (type === 'sale') {
    t.textContent = 'Registrar Venda';
    const s = getState();
    const form = document.createElement('form');
    form.setAttribute('onsubmit', 'handleSaleSubmit(event)');
    form.innerHTML = `
      <div class="form-group"><label>Produto</label><select id="v-prod"></select></div>
      <div class="form-group"><label>Cliente</label><select id="v-cli"></select></div>
      <div class="form-group"><label>Valor de Venda (R$)</label><input id="v-valor" type="number" step="0.01" min="0.01" required></div>
      <button type="submit" class="btn btn-primary w-full">Finalizar Venda</button>`;
    // Popula selects com textContent
    const selProd = form.querySelector('#v-prod');
    const selCli = form.querySelector('#v-cli');
    if (!s.produtos.length) {
      const opt = document.createElement('option');
      opt.textContent = 'Nenhum produto cadastrado';
      opt.disabled = true;
      selProd.appendChild(opt);
    } else {
      s.produtos.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.nome;
        opt.textContent = p.nome;
        selProd.appendChild(opt);
      });
    }
    const optNone = document.createElement('option');
    optNone.value = '';
    optNone.textContent = 'Sem cliente';
    selCli.appendChild(optNone);
    s.clientes.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.nome;
      opt.textContent = c.nome;
      selCli.appendChild(opt);
    });
    b.appendChild(form);

  } else if (type === 'client') {
    t.textContent = 'Novo Contato';
    b.innerHTML = `
      <form onsubmit="handleClientSubmit(event)">
        <div class="form-group"><label>Nome Completo</label><input id="cli-nome" required maxlength="100"></div>
        <div class="form-group"><label>WhatsApp</label><input id="cli-whats" type="tel" maxlength="20"></div>
        <button type="submit" class="btn btn-primary w-full">Salvar Contato</button>
      </form>`;

  } else if (type === 'cost') {
    t.textContent = 'Novo Custo Fixo';
    b.innerHTML = `
      <form onsubmit="handleCostSubmit(event)">
        <div class="form-group"><label>Descrição</label><input id="c-nome" required maxlength="100"></div>
        <div class="form-group"><label>Valor Mensal (R$)</label><input id="c-valor" type="number" step="0.01" min="0.01" required></div>
        <button type="submit" class="btn btn-primary w-full">Salvar Custo</button>
      </form>`;
  }
}

function closeModal() {
  $('modal-container')?.classList.add('is-hidden');
}
