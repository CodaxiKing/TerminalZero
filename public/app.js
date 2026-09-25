const $ = s => document.querySelector(s);
let state = { accounts: [], jobs: [] }, selected = new Set(), urls = {}, timer;
const escape = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function message(text) { $('#message').textContent = text; $('#message').hidden = false; clearTimeout(timer); timer = setTimeout(() => $('#message').hidden = true, 9000); }
async function api(url, body) {
  const response = await fetch(url, body === undefined ? {} : { method: 'POST', headers: body instanceof FormData ? {} : { 'Content-Type': 'application/json' }, body: body instanceof FormData ? body : JSON.stringify(body) });
  const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Falha na operação'); return result;
}
const labels = { cutting: 'Cortando vídeo', ready: 'Aguardando resultados', running: 'Gerando no Higgsfield', merging: 'Unindo resultados', complete: 'Concluído', error: 'Precisa de atenção' };
let signature = '';
async function refresh() {
  const next = await api('/api/state');
  if (JSON.stringify(next) === signature) return;
  signature = JSON.stringify(next); state = next; render();
}
function render() {
  $('#account-count').textContent = state.accounts.length;
  $('#accounts').innerHTML = state.accounts.map(a => `<div class="account"><span>${escape(a.email)}</span><button data-open="${a.id}">Abrir login ↗</button></div>`).join('') || '<p class="muted">Nenhuma conta adicionada.</p>';
  $('#account-selection').innerHTML = state.accounts.map(a => `<label class="check"><input type="checkbox" value="${a.id}" ${selected.has(a.id) ? 'checked' : ''}>${escape(a.email)}</label>`).join('') || '<p class="muted">Cadastre suas contas ao lado para distribuir os trechos.</p>';
  $('#automation-status').textContent = state.automationReady ? 'Automação configurada. Confirme os logins antes de gerar. O uso pode consumir créditos nas contas selecionadas.' : 'Integração automática pendente de validação no Higgsfield. Você pode preparar os cortes, processá-los no site e importar os resultados aqui.';
  $('#project-count').textContent = `${state.jobs.length} projetos`;
  if (!state.jobs.length) return;
  $('#jobs').innerHTML = state.jobs.map(j => {
    const busy = ['cutting', 'running', 'merging'].includes(j.status);
    return `<article class="job"><div class="job-head"><strong>${escape(j.name)} <small> / ${j.duration.toFixed(2)}s · ${j.parts.length} trechos</small></strong><span class="badge">${labels[j.status] || escape(j.status)}</span></div>${j.error ? `<p class="error">${escape(j.error)}</p>` : ''}<div class="parts">${j.parts.map(p => `<div class="part"><strong>${String(p.index + 1).padStart(2, '0')} / ${p.start}s → ${(p.start + p.duration).toFixed(2)}s</strong><p>${escape(state.accounts.find(a => a.id === p.accountId)?.email || '')}</p>${j.status !== 'cutting' ? `<a href="/api/jobs/${j.id}/files/part-${p.index}.mp4">↓ Baixar trecho</a>` : ''}<label>${p.ready ? '✓ Resultado importado · substituir' : 'Importar resultado do Higgsfield'}<input type="file" accept="video/*" data-job="${j.id}" data-part="${p.index}" ${busy ? 'disabled' : ''}></label></div>`).join('')}</div><div class="job-actions"><button data-generate="${j.id}" ${busy || !state.automationReady || j.status === 'complete' ? 'disabled' : ''}>Gerar nas contas</button><button data-merge="${j.id}" ${busy || !j.parts.every(p => p.ready) ? 'disabled' : ''}>Unir resultados</button><a class="link" href="/api/jobs/${j.id}/files/character">↓ Personagem</a>${j.status === 'complete' ? `<a href="/api/jobs/${j.id}/files/final.mp4">↓ Baixar vídeo final</a>` : ''}</div></article>`;
  }).join('');
}
$('#account-selection').addEventListener('change', e => { if (e.target.checked) selected.add(e.target.value); else selected.delete(e.target.value); });
$('#account-form').addEventListener('submit', async e => {
  e.preventDefault(); const button = e.target.querySelector('button'); button.disabled = true;
  try { const a = await api('/api/accounts', Object.fromEntries(new FormData(e.target))); selected.add(a.id); e.target.reset(); await refresh(); message('Conta adicionada. Abra o login para conectar ao Higgsfield.'); } catch (err) { message(err.message); } finally { button.disabled = false; }
});
for (const [input, preview] of [['video', 'preview'], ['character', 'character-preview']]) {
  $(`#${input}`).addEventListener('change', e => {
    if (urls[input]) URL.revokeObjectURL(urls[input]);
    const file = e.target.files[0]; $(`#${preview}`).hidden = !file;
    if (!file) return;
    urls[input] = URL.createObjectURL(file); $(`#${preview}`).src = urls[input];
  });
}
$('#preview').addEventListener('loadedmetadata', () => {
  const duration = $('#preview').duration, count = Math.ceil((duration - .000001) / 5);
  $('#estimate').textContent = `${duration.toFixed(2)} segundos → ${count} trechos → ${count} contas. Último trecho: ${(duration - (count - 1) * 5).toFixed(2)}s.`;
});
$('#project-form').addEventListener('submit', async e => {
  e.preventDefault(); $('#prepare').disabled = true;
  try { const data = new FormData(e.target); data.set('accounts', JSON.stringify([...selected])); await api('/api/jobs', data); await refresh(); message('Vídeo recebido. Preparando os trechos…'); } catch (err) { message(err.message); } finally { $('#prepare').disabled = false; }
});
document.addEventListener('click', async e => {
  const button = e.target.closest('button'); if (!button) return;
  const { open, generate, merge } = button.dataset; if (!open && !generate && !merge) return;
  if (generate && !confirm('Iniciar as gerações nas contas selecionadas? Isso pode consumir créditos no Higgsfield.')) return;
  button.disabled = true;
  try { await api(open ? `/api/accounts/${open}/open` : `/api/jobs/${generate || merge}/${generate ? 'generate' : 'merge'}`, {}); await refresh(); if (open) message('Sessão aberta no Edge. Faça o login nessa janela.'); } catch (err) { message(err.message); } finally { button.disabled = false; }
});
$('#jobs').addEventListener('change', async e => {
  if (!e.target.dataset.job || !e.target.files[0]) return;
  e.target.disabled = true;
  try { const data = new FormData(); data.set('video', e.target.files[0]); await api(`/api/jobs/${e.target.dataset.job}/results/${e.target.dataset.part}`, data); await refresh(); message('Resultado importado.'); } catch (err) { message(err.message); } finally { e.target.disabled = false; }
});
refresh().catch(e => message(e.message));
setInterval(() => refresh().catch(() => {}), 2500);
