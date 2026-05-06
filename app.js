/* ── STATE ── */
let CU = null;
let sidebarOpen = false;
let modalCb = null;
let regTypeSel = -1;

/* ── AUTH ── */
function fillLogin(email, pass) {
  document.getElementById('loginEmail').value = email;
  document.getElementById('loginPass').value = pass;
  document.getElementById('loginError').style.display = 'none';
}

function doLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const pass  = document.getElementById('loginPass').value;
  const user  = USERS[email];
  const err   = document.getElementById('loginError');
  if (!user || user.pass !== pass) { err.style.display = 'block'; return; }
  err.style.display = 'none';
  CU = user;

  /* topbar */
  document.getElementById('roleChip').textContent = user.role;
  document.getElementById('topbarAvatar').textContent = user.initials;

  /* sidebar */
  document.getElementById('sidebarAvatar').textContent = user.initials;
  document.getElementById('sidebarName').textContent = user.role;
  document.getElementById('sidebarEmail').textContent = email;

  /* screens */
  document.getElementById('loginScreen').classList.remove('active');
  document.getElementById('appScreen').classList.add('active');

  applyPermissions();
  renderPneus('todos');
  renderFrota();
  renderTrocas();
  renderOcorrencias();
}

function doLogout() {
  CU = null;
  document.getElementById('appScreen').classList.remove('active');
  document.getElementById('loginScreen').classList.add('active');
  document.getElementById('loginEmail').value = '';
  document.getElementById('loginPass').value = '';
  showTab('painel');
}

/* ── PERMISSIONS ── */
function applyPermissions() {
  if (!CU) return;
  const p = CU.perms;

  /* financial fields */
  document.querySelectorAll('.financial-only').forEach(el => {
    el.style.display = p.financeiro ? '' : 'none';
  });

  /* registrar tab */
  document.getElementById('regContent').style.display  = p.registrar ? '' : 'none';
  document.getElementById('regDenied').style.display   = p.registrar ? 'none' : 'block';
  const navReg = document.getElementById('navRegistrar');
  if (!p.registrar) navReg.classList.add('locked');

  /* permissões tab */
  document.getElementById('permContent').style.display = p.permissoes ? '' : 'none';
  document.getElementById('permDenied').style.display  = p.permissoes ? 'none' : 'block';
  const navPerm = document.getElementById('navPermissoes');
  if (!p.permissoes) {
    navPerm.classList.add('locked');
    navPerm.onclick = (e) => { e.preventDefault(); showToast('Acesso restrito — apenas administradores', '#C0392B'); };
  }
}

/* ── NAVIGATION ── */
function showTab(id) {
  if (!CU) return;
  if (id === 'permissoes' && !CU.perms.permissoes) { showToast('Acesso restrito', '#C0392B'); return; }

  document.querySelectorAll('.tab-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const sec = document.getElementById(id);
  if (sec) sec.classList.add('active');

  const nav = document.querySelector(`.nav-item[data-tab="${id}"]`);
  if (nav) nav.classList.add('active');

  const titles = { painel:'Painel', pneus:'Pneus', frota:'Frota', ocorrencias:'Ocorrências', registrar:'Registrar', permissoes:'Permissões', ia:'Assistente IA' };
  document.getElementById('pageTitle').textContent = titles[id] || id;

  if (window.innerWidth < 769 && sidebarOpen) toggleSidebar();
}

function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  sidebarOpen = !sidebarOpen;
  sb.classList.toggle('open', sidebarOpen);
}

/* ── PNEUS ── */
function filterPneus(btn, tipo) {
  document.querySelectorAll('#pneuFilters .chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  renderPneus(tipo);
}

function renderPneus(tipo) {
  const list = tipo === 'todos' ? PNEUS :
               tipo === 'critico' ? PNEUS.filter(p => p.desgaste >= 80) :
               PNEUS.filter(p => p.tipo === tipo);

  const g = document.getElementById('pneuGrid');
  g.innerHTML = '';

  if (!list.length) {
    g.innerHTML = '<p style="color:var(--text3);font-size:.85rem;padding:.5rem">Nenhum pneu encontrado.</p>';
    return;
  }

  list.forEach(p => {
    const barColor = p.desgaste >= 80 ? 'var(--red)' : p.desgaste >= 55 ? 'var(--amber)' : 'var(--green)';
    const icoColor = p.tipo === 'novo' ? 'var(--blue)' : 'var(--teal)';
    const icoBg    = p.tipo === 'novo' ? 'var(--blue-bg)' : 'var(--teal-bg)';
    const icoName  = p.tipo === 'novo' ? 'ti-circle-dashed' : 'ti-refresh';
    const badgeCls = p.tipo === 'novo' ? 'blue' : 'teal';
    const badgeLabel = p.tipo === 'novo' ? 'Novo' : 'Recapado';
    const custo = CU && CU.perms.financeiro ? ` · R$ ${p.custo.toLocaleString('pt-BR')}` : '';

    const card = document.createElement('div');
    card.className = 'pneu-card';
    card.innerHTML = `
      <div class="pneu-card-top">
        <div class="pneu-ico" style="background:${icoBg};color:${icoColor}">
          <i class="ti ${icoName}" aria-hidden="true"></i>
        </div>
        <span class="badge ${badgeCls}">${badgeLabel}</span>
      </div>
      <div class="pneu-name">${p.veiculo} · ${p.eixo}</div>
      <div class="pneu-sub">${p.marca} · ${p.medida}</div>
      <div class="pneu-bar-wrap">
        <div class="pneu-bar-labels">
          <span>Desgaste</span>
          <span style="color:${barColor};font-weight:600">${p.desgaste}%</span>
        </div>
        <div class="pneu-bar-bg">
          <div class="pneu-bar-fill" style="width:${p.desgaste}%;background:${barColor}"></div>
        </div>
      </div>
      <div class="pneu-meta">${p.data} · ${p.km.toLocaleString('pt-BR')} km${custo}</div>
      <div class="pneu-actions">
        <button class="btn-amber btn-xs" onclick="editarPneu(${p.id})">
          <i class="ti ti-edit" aria-hidden="true"></i> Editar
        </button>
        ${p.tipo === 'novo' && p.desgaste > 50
          ? `<button class="btn-teal btn-xs" onclick="openRecapagem(${p.id})">
               <i class="ti ti-refresh" aria-hidden="true"></i> Recapar
             </button>` : ''}
      </div>`;
    g.appendChild(card);
  });
}

/* ── FROTA ── */
function renderFrota() {
  const g = document.getElementById('frotaList');
  g.innerHTML = '';
  FROTA.filter(v => v.tipo === 'ativo').forEach(v => {
    const icoBg    = v.status === 'ok' ? 'var(--blue-bg)' : 'var(--amber-bg)';
    const icoColor = v.status === 'ok' ? 'var(--blue)' : 'var(--amber)';
    const card = document.createElement('div');
    card.className = 'frota-card';
    card.innerHTML = `
      <div class="frota-hd" onclick="toggleFrota(this)">
        <div class="frota-hd-icon" style="background:${icoBg};color:${icoColor}">
          <i class="ti ti-truck" aria-hidden="true"></i>
        </div>
        <div class="frota-hd-info">
          <div class="frota-hd-name">${v.placa} · ${v.modelo}</div>
          <div class="frota-hd-sub">${v.km.toLocaleString('pt-BR')} km · ${v.ano}</div>
        </div>
        <span class="badge ${v.status}">${v.statusLabel}</span>
        <i class="ti ti-chevron-down frota-hd-chev" aria-hidden="true"></i>
      </div>
      <div class="frota-bd">
        <div class="frota-info-grid">
          <div><div class="fi-label">Quilometragem</div><div class="fi-val">${v.km.toLocaleString('pt-BR')} km</div></div>
          <div><div class="fi-label">Ano</div><div class="fi-val">${v.ano}</div></div>
          <div><div class="fi-label">Status</div><div class="fi-val"><span class="badge ${v.status}">${v.statusLabel}</span></div></div>
        </div>
        <div class="frota-actions">
          <button class="btn-amber btn-xs" onclick="editarVeiculo(${v.id})">
            <i class="ti ti-edit" aria-hidden="true"></i> Editar
          </button>
          <button class="btn-secondary btn-xs" onclick="showTab('pneus')">
            <i class="ti ti-circle-dashed" aria-hidden="true"></i> Ver pneus
          </button>
          ${CU && CU.perms.trocaVeiculo
            ? `<button class="btn-danger-sm btn-xs" onclick="baixarVeiculo(${v.id})">
                 <i class="ti ti-arrow-down" aria-hidden="true"></i> Dar baixa
               </button>` : ''}
        </div>
      </div>`;
    g.appendChild(card);
  });
}

function toggleFrota(hd) {
  const bd   = hd.nextElementSibling;
  const chev = hd.querySelector('.frota-hd-chev');
  const open = bd.classList.toggle('open');
  chev.classList.toggle('open', open);
}

/* ── TROCAS ── */
function renderTrocas() {
  const g = document.getElementById('trocaTimeline');
  g.innerHTML = '';
  TROCAS.forEach(t => {
    const item = document.createElement('div');
    item.className = 'tl-item';
    item.innerHTML = `
      <div class="tl-dot ${t.cor}">${t.tipo}</div>
      <div class="tl-content">
        <div class="tl-title">${t.titulo}</div>
        <div class="tl-sub">
          ${t.sub} ·
          <span class="date-edit-wrap">
            <span class="date-val" id="td_${t.id}">${t.data}</span>
            <button class="date-edit-btn" onclick="inlineEditDate('td_${t.id}')" aria-label="Editar data">
              <i class="ti ti-edit" aria-hidden="true"></i>
            </button>
          </span>
        </div>
      </div>`;
    g.appendChild(item);
  });
}

/* ── OCORRÊNCIAS ── */
function renderOcorrencias() {
  const fs = (document.getElementById('filtroStatus')?.value || '');
  const fv = (document.getElementById('filtroVei')?.value    || '');
  const ft = (document.getElementById('filtroTipo')?.value   || '');

  const list = OCORRENCIAS.filter(o =>
    (!fs || o.status === fs) &&
    (!fv || o.veiculo === fv) &&
    (!ft || o.tipo === ft)
  );

  const g = document.getElementById('occList');
  g.innerHTML = '';

  if (!list.length) {
    g.innerHTML = '<p style="color:var(--text3);font-size:.85rem;padding:.5rem">Nenhuma ocorrência encontrada.</p>';
    return;
  }

  list.forEach(o => {
    const sc = o.status === 'Urgente' ? 'danger' : o.status === 'Em breve' ? 'warn' : o.status === 'Concluído' ? 'ok' : 'blue';
    const tc = o.tipo === 'Pneu novo' ? 'purple' : o.tipo === 'Recapagem' ? 'teal' : o.tipo === 'Troca de veículo' ? 'blue' : '';
    const custo = CU && CU.perms.financeiro && o.custo !== '—' ? ` · <strong>${o.custo}</strong>` : '';

    const card = document.createElement('div');
    card.className = 'occ-card';
    card.innerHTML = `
      <div class="occ-header">
        <span class="list-dot ${sc}" style="margin-top:4px;flex-shrink:0"></span>
        <div class="occ-title">
          ${o.servico} — ${o.veiculo}
          ${tc ? `<span class="badge ${tc}" style="font-size:.7rem;margin-left:.4rem">${o.tipo}</span>` : ''}
        </div>
        <span class="badge ${sc}">${o.status}</span>
      </div>
      <div class="occ-meta">
        <span class="date-edit-wrap">
          <span class="date-val" id="od_${o.id}">${o.data}</span>
          <button class="date-edit-btn" onclick="inlineEditDate('od_${o.id}')" aria-label="Editar data">
            <i class="ti ti-edit" aria-hidden="true"></i>
          </button>
        </span>
        · ${o.mec}${custo}
      </div>
      ${o.desc ? `<div class="occ-desc">${o.desc}</div>` : ''}`;
    g.appendChild(card);
  });
}

/* ── INLINE DATE EDIT ── */
function inlineEditDate(spanId) {
  const span = document.getElementById(spanId);
  if (!span) return;
  const current = span.textContent.trim();
  const parts   = current.split('/');
  const isoVal  = parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : '';
  const inp = document.createElement('input');
  inp.type = 'date';
  inp.className = 'date-input-inline';
  inp.value = isoVal;
  inp.onblur = () => {
    if (inp.value) {
      const [y,m,d] = inp.value.split('-');
      span.textContent = `${d}/${m}/${y}`;
    }
    inp.replaceWith(span);
    showToast('Data atualizada');
  };
  inp.onkeydown = e => {
    if (e.key === 'Enter') inp.blur();
    if (e.key === 'Escape') inp.replaceWith(span);
  };
  span.replaceWith(inp);
  setTimeout(() => inp.focus(), 0);
}

/* ── MODALS ── */
function openModal(title, html, cb) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = html;
  document.getElementById('modalOverlay').classList.add('open');
  modalCb = cb;
}
function closeModal() { document.getElementById('modalOverlay').classList.remove('open'); modalCb = null; }
function closeModalOutside(e) { if (e.target === document.getElementById('modalOverlay')) closeModal(); }
function saveModal() { if (modalCb) modalCb(); closeModal(); }

function fieldHtml(label, id, type, value, placeholder = '') {
  if (type === 'select') return '';
  return `<div class="form-field">
    <label>${label}</label>
    <input type="${type}" id="${id}" value="${value}" placeholder="${placeholder}"
      style="width:100%;padding:.5rem .7rem;border:1px solid var(--border);border-radius:var(--radius);font-size:.875rem;font-family:inherit">
  </div>`;
}

/* Edit pneu */
function editarPneu(id) {
  const p = PNEUS.find(x => x.id === id);
  if (!p) return;
  const isoData = brToIso(p.data);
  openModal(`Editar pneu — ${p.veiculo}`, `
    <div class="form-row">
      ${fieldHtml('Marca', 'ep_marca', 'text', p.marca)}
      ${fieldHtml('Medida', 'ep_medida', 'text', p.medida)}
    </div>
    <div class="form-row">
      <div class="form-field"><label>Data instalação</label>
        <input type="date" id="ep_data" value="${isoData}" style="width:100%;padding:.5rem .7rem;border:1px solid var(--border);border-radius:var(--radius);font-size:.875rem">
      </div>
      ${fieldHtml('Desgaste (%)', 'ep_desgaste', 'number', p.desgaste)}
    </div>
    <div class="form-row">
      ${fieldHtml('Km na instalação', 'ep_km', 'number', p.km)}
      ${fieldHtml('DOT', 'ep_dot', 'text', p.dot)}
    </div>`, () => {
    p.marca    = v('ep_marca')    || p.marca;
    p.medida   = v('ep_medida')   || p.medida;
    p.desgaste = parseInt(v('ep_desgaste')) || p.desgaste;
    p.km       = parseInt(v('ep_km'))       || p.km;
    p.dot      = v('ep_dot')      || p.dot;
    const dv   = v('ep_data');
    if (dv) { const [y,m,d] = dv.split('-'); p.data = `${d}/${m}/${y}`; }
    renderPneus('todos');
    showToast('Pneu atualizado com sucesso');
  });
}

/* Edit veiculo */
function editarVeiculo(id) {
  const vei = FROTA.find(x => x.id === id);
  if (!vei) return;
  openModal(`Editar veículo — ${vei.placa}`, `
    <div class="form-row">
      ${fieldHtml('Modelo', 'ev_modelo', 'text', vei.modelo)}
      ${fieldHtml('Ano', 'ev_ano', 'number', vei.ano)}
    </div>
    <div class="form-row">
      ${fieldHtml('Km atual', 'ev_km', 'number', vei.km)}
      <div class="form-field"><label>Status</label>
        <select id="ev_status" style="width:100%;padding:.5rem .7rem;border:1px solid var(--border);border-radius:var(--radius);font-size:.875rem">
          <option value="ok"     ${vei.status==='ok'?'selected':''}>Em dia</option>
          <option value="warn"   ${vei.status==='warn'?'selected':''}>Próximo</option>
          <option value="danger" ${vei.status==='danger'?'selected':''}>Atrasado</option>
        </select>
      </div>
    </div>`, () => {
    vei.modelo = v('ev_modelo') || vei.modelo;
    vei.ano    = parseInt(v('ev_ano')) || vei.ano;
    vei.km     = parseInt(v('ev_km'))  || vei.km;
    vei.status = v('ev_status');
    vei.statusLabel = { ok:'Em dia', warn:'Próximo', danger:'Atrasado' }[vei.status];
    renderFrota();
    showToast('Veículo atualizado com sucesso');
  });
}

/* Baixar veículo */
function baixarVeiculo(id) {
  const vei = FROTA.find(x => x.id === id);
  if (!vei) return;
  openModal(`Baixar veículo — ${vei.placa}`, `
    <p style="font-size:.875rem;color:var(--text);margin-bottom:.9rem">
      Confirma a baixa do veículo <strong>${vei.placa} (${vei.modelo})</strong>?
    </p>
    <div class="form-field"><label>Motivo</label>
      <input type="text" id="bx_motivo" placeholder="Ex: Venda, sucateamento..."
        style="width:100%;padding:.5rem .7rem;border:1px solid var(--border);border-radius:var(--radius);font-size:.875rem">
    </div>
    <div class="form-row">
      <div class="form-field"><label>Data da baixa</label>
        <input type="date" id="bx_data"
          style="width:100%;padding:.5rem .7rem;border:1px solid var(--border);border-radius:var(--radius);font-size:.875rem">
      </div>
      <div class="form-field financial-only"><label>Valor (R$)</label>
        <input type="number" id="bx_valor" placeholder="0,00"
          style="width:100%;padding:.5rem .7rem;border:1px solid var(--border);border-radius:var(--radius);font-size:.875rem">
      </div>
    </div>`, () => {
    vei.tipo = 'baixado';
    const dv = v('bx_data');
    const motivo = v('bx_motivo') || 'Baixa';
    let dataStr = new Date().toLocaleDateString('pt-BR');
    if (dv) { const [y,m,d] = dv.split('-'); dataStr = `${d}/${m}/${y}`; }
    const cv = v('bx_valor');
    const custo = cv ? 'R$ ' + parseFloat(cv).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '—';
    OCORRENCIAS.unshift({ id: OCORRENCIAS.length + 1, veiculo: vei.placa, tipo: 'Troca de veículo', servico: 'Baixa', data: dataStr, status: 'Concluído', mec: 'Setor admin', custo, desc: motivo });
    TROCAS.unshift({ id: TROCAS.length + 1, tipo: '−', cor: 'purple', titulo: `${vei.placa} baixado — ${vei.modelo}`, sub: motivo, data: dataStr });
    renderFrota(); renderTrocas(); renderOcorrencias();
    showToast(`${vei.placa} baixado da frota`, '#C0392B');
  });
}

/* ── REGISTER ── */
function openRegister(type) {
  if (!CU || !CU.perms.registrar) { showToast('Sem permissão para registrar', '#C0392B'); return; }
  showTab('registrar');
  setTimeout(() => selectRegType(type), 80);
}

function openRecapagem(pneuId) {
  const p = PNEUS.find(x => x.id === pneuId);
  if (!p) return;
  openRegister(2);
  setTimeout(() => {
    const el = document.getElementById('rcPlaca');
    if (el) el.value = p.veiculo;
  }, 150);
  showToast('Pneu pré-selecionado para recapagem');
}

function selectRegType(i) {
  regTypeSel = i;
  [0,1,2,3].forEach(j => {
    const b = document.getElementById(`rtBtn${j}`);
    if (b) b.classList.toggle('selected', j === i);
  });
  const ids = ['formManutencao','formPneu','formRecapagem','formVeiculo'];
  ids.forEach((id, j) => {
    const el = document.getElementById(id);
    if (el) el.style.display = j === i ? 'block' : 'none';
  });
  const btn = document.getElementById('btnSalvar');
  if (btn) btn.style.display = 'block';

  const el = document.getElementById(ids[i]);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function salvarRegistro() {
  const tipos = ['Manutenção','Pneu novo','Recapagem','Troca de veículo'];
  const tipo = tipos[regTypeSel] || 'Manutenção';
  let veiculo = '—', servico = '—', mec = '—', custo = '—', desc = '';
  let data = new Date().toLocaleDateString('pt-BR');

  if (regTypeSel === 0) {
    veiculo = v('mPlaca'); servico = v('mTipo');
    data = isoToBr(v('mData')) || data;
    mec = v('mMec') || '—';
    custo = formatCusto(v('mCusto'));
    desc = v('mDesc');
  } else if (regTypeSel === 1) {
    veiculo = v('pnPlaca'); servico = v('pnEixo');
    data = isoToBr(v('pnData')) || data;
    mec = v('pnMarca') || '—';
    custo = formatCusto(v('pnCusto'));
    const kmN = parseInt(v('pnKm')) || 0;
    if (veiculo && servico) {
      PNEUS.push({ id: PNEUS.length + 1, veiculo, eixo: servico, marca: mec, medida: v('pnMedida') || '—', tipo: 'novo', desgaste: 0, km: kmN, data, custo: parseFloat(v('pnCusto')) || 0, dot: v('pnDot') || '—' });
    }
    desc = `${v('pnMedida')} DOT ${v('pnDot')}`;
  } else if (regTypeSel === 2) {
    veiculo = v('rcPlaca'); servico = v('rcEixo');
    data = isoToBr(v('rcSaida')) || data;
    mec = v('rcRecap') || '—';
    custo = formatCusto(v('rcCusto'));
    desc = v('rcObs');
    const existing = PNEUS.find(p => p.veiculo === veiculo);
    if (existing) { existing.tipo = 'recapado'; existing.desgaste = 15; }
  } else if (regTypeSel === 3) {
    veiculo = v('vPlaca') || '—'; servico = v('vTipo');
    data = isoToBr(v('vData')) || data;
    mec = 'Setor admin'; custo = formatCusto(v('vValor'));
    desc = v('vObs');
    const modelo = v('vModelo');
    if (veiculo !== '—' && modelo && servico.includes('Incorp')) {
      const kmN = parseInt(v('vKm')) || 0;
      FROTA.push({ id: FROTA.length + 1, placa: veiculo, modelo, ano: new Date().getFullYear(), km: kmN, status: 'ok', statusLabel: 'Em dia', tipo: 'ativo' });
      TROCAS.unshift({ id: TROCAS.length + 1, tipo: '+', cor: 'blue', titulo: `${veiculo} incorporado — ${modelo}`, sub: v('vMotivo') || 'Incorporação', data });
    }
  }

  OCORRENCIAS.unshift({ id: OCORRENCIAS.length + 1, veiculo, tipo, servico, data, status: 'Concluído', mec, custo, desc });
  renderFrota(); renderTrocas(); renderOcorrencias(); renderPneus('todos');
  showToast('Registro salvo com sucesso!');
  showTab('ocorrencias');
}

/* ── IA ── */
async function sendIA(prompt) {
  const input = document.getElementById('iaInput');
  const q = prompt || input.value.trim();
  if (!q) return;
  input.value = '';

  const resp = document.getElementById('iaResp');
  const txt  = document.getElementById('iaText');
  resp.style.display = 'block';
  txt.innerHTML = '<span style="color:var(--text3);font-style:italic">Consultando IA...</span>';

  const ctx = FROTA.filter(f => f.tipo === 'ativo').map(f => `${f.placa} ${f.modelo} ${f.km.toLocaleString('pt-BR')}km`).join(', ');

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: `Você é especialista em manutenção de frotas de caminhões pesados, pneus e recapagens. Responda em português de forma prática e objetiva. Frota atual: ${ctx}.`,
        messages: [{ role: 'user', content: q }]
      })
    });
    const d = await r.json();
    const ans = d.content.filter(b => b.type === 'text').map(b => b.text).join('');
    txt.innerHTML = ans.replace(/\n/g, '<br>');
  } catch(e) {
    txt.innerHTML = 'Erro ao conectar com a IA. Verifique sua conexão.';
  }
}

/* ── HELPERS ── */
function v(id) {
  const el = document.getElementById(id);
  return el ? el.value : '';
}
function brToIso(br) {
  const p = br.split('/');
  return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : '';
}
function isoToBr(iso) {
  if (!iso) return '';
  const [y,m,d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
function formatCusto(val) {
  if (!val) return '—';
  return 'R$ ' + parseFloat(val).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
}

function showToast(msg, bg) {
  const t   = document.getElementById('toast');
  const msg_el = document.getElementById('toastMsg');
  msg_el.textContent = msg;
  t.style.background = bg || 'var(--text)';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}
