// Админка заявок. Все данные подставляются через textContent, HTML из ответов сервера не вставляется.
const API = '../api';
const STATUS = { new: 'Новая', accepted: 'Принята', rejected: 'Отклонена', done: 'Выполнена' };
const TABS = [['all', 'Все'], ['new', 'Новые'], ['accepted', 'Принятые'], ['rejected', 'Отклонённые'], ['done', 'Выполненные']];
const $ = (id) => document.getElementById(id);
let items = [];
let filter = 'new';
let timer = 0;

async function api(path, method = 'GET', body) {
  const res = await fetch(`${API}${path}`, {
    method,
    credentials: 'same-origin',
    headers: { 'X-Requested-With': 'arka', ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = {};
  try { data = await res.json(); } catch { /* пустой ответ */ }
  if (res.status === 401 && path !== '/admin/login') showLogin();
  return { ok: res.ok, status: res.status, data };
}

function showLogin() {
  clearInterval(timer);
  $('panel').hidden = true;
  $('login').hidden = false;
  $('password').focus();
}

function showPanel() {
  $('login').hidden = true;
  $('panel').hidden = false;
  load();
  clearInterval(timer);
  timer = setInterval(load, 20000);
}

async function load() {
  const r = await api('/admin/requests');
  if (!r.ok) return;
  items = r.data.requests;
  render();
}

function fmtTime(ts) {
  return new Date(ts * 1000).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
}
function fmtDate(iso) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
};

function actionButton(label, status, cls, id) {
  const b = el('button', `btn ${cls}`, label);
  b.type = 'button';
  b.addEventListener('click', async () => {
    b.disabled = true;
    await api(`/admin/requests/${id}`, 'POST', { status });
    load();
  });
  return b;
}

function card(r) {
  const li = el('li', 'card');
  li.dataset.status = r.status;
  const top = el('div', 'row');
  top.append(el('span', 'name', r.name), el('span', 'badge', STATUS[r.status]));
  top.lastChild.dataset.status = r.status;

  const facts = el('div', 'facts');
  const tel = el('a', '', r.phone);
  tel.href = `tel:${r.phone.replace(/[^\d+]/g, '')}`;
  facts.append(tel, el('span', '', `Дата: ${fmtDate(r.date)}`), el('span', '', `Тариф: ${r.tariff}`));

  const meta = el('div', 'row');
  meta.append(el('span', 'when', `Получена ${fmtTime(r.created)}`), el('span', 'code', `№ ${r.code}`));

  const acts = el('div', 'acts');
  if (r.status === 'new') acts.append(actionButton('Принять', 'accepted', 'btn--ok', r.id), actionButton('Отклонить', 'rejected', 'btn--bad', r.id));
  if (r.status === 'accepted') acts.append(actionButton('Выполнена', 'done', 'btn--ok', r.id), actionButton('Отклонить', 'rejected', 'btn--bad', r.id));
  if (r.status === 'rejected' || r.status === 'done') acts.append(actionButton('Вернуть в новые', 'new', '', r.id));
  const del = el('button', 'btn btn--bad', 'Удалить');
  del.type = 'button';
  del.addEventListener('click', async () => {
    if (!confirm(`Удалить заявку ${r.name}?`)) return;
    await api(`/admin/requests/${r.id}`, 'DELETE');
    load();
  });
  acts.append(del);
  li.append(top, facts, meta, acts);
  return li;
}

function render() {
  const count = (s) => (s === 'all' ? items.length : items.filter((r) => r.status === s).length);
  $('tabs').replaceChildren(...TABS.map(([key, label]) => {
    const b = el('button', 'tab', label);
    b.type = 'button';
    b.setAttribute('aria-pressed', key === filter);
    b.append(el('b', '', count(key)));
    b.addEventListener('click', () => { filter = key; render(); });
    return b;
  }));
  const shown = filter === 'all' ? items : items.filter((r) => r.status === filter);
  $('list').replaceChildren(...shown.map(card));
  $('empty').hidden = shown.length > 0;
  const fresh = count('new');
  $('summary').textContent = fresh ? `Новых заявок: ${fresh}` : 'Новых заявок нет';
  document.title = fresh ? `(${fresh}) Заявки АРКА 123: админка` : 'Заявки АРКА 123: админка';
}

$('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('login-msg').textContent = '';
  const r = await api('/admin/login', 'POST', { password: $('password').value });
  if (r.ok) { $('password').value = ''; showPanel(); } else $('login-msg').textContent = r.data.error || 'Не удалось войти';
});
$('logout').addEventListener('click', async () => { await api('/admin/logout', 'POST', {}); showLogin(); });

// есть ли уже действующая сессия
api('/admin/requests').then((r) => { if (r.ok) { items = r.data.requests; showPanel(); } else showLogin(); });
