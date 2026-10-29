// Связь формы с backend заявок. Если адрес API не задан (версия на GitHub Pages), форма работает в демо-режиме.
const API = import.meta.env.VITE_API || '';
export const hasApi = Boolean(API);

async function call(path, options = {}) {
  try {
    const res = await fetch(API + path, {
      ...options,
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'arka' },
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: { error: 'Нет связи с сервером. Попробуйте чуть позже.' } };
  }
}

export const sendRequest = (payload) => call('/requests', { method: 'POST', body: JSON.stringify(payload) });
export const fetchStatus = (code) => call(`/status/${encodeURIComponent(code)}`);

const KEY = 'arka-request';
export const loadSaved = () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } };
export const saveRequest = (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* хранилище недоступно */ } };

export const STATUS_TEXT = { new: 'ожидает подтверждения', accepted: 'принята', rejected: 'отклонена', done: 'выполнена' };

// текст уведомления для клиента при смене статуса
export function notice(code, s) {
  const date = s.date ? new Date(`${s.date}T12:00:00`).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }) : '';
  if (s.status === 'accepted') return `Заявка №${code} принята. Мы подтвердили ${date}. До встречи напротив Библиотеки!`;
  if (s.status === 'rejected') return `Заявка №${code} отклонена: на выбранную дату зал занят. Выберите другую дату.`;
  if (s.status === 'done') return `Заявка №${code} выполнена. Спасибо, что выбрали АРКА 123!`;
  return '';
}
