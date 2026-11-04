const SUPABASE_URL = 'https://muvdysgfzpeesohiwfrc.supabase.co';
const SUPABASE_KEY = 'sb_publishable_WfkSjP57epCdmBq8IuBoJA_KBOlay5h';
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const loginForm = document.getElementById('login');
const loginMsg = document.getElementById('login-msg');
const panel = document.getElementById('panel');
const whoEl = document.getElementById('who');
const msgEl = document.getElementById('msg');
const listEl = document.getElementById('list');
const emptyEl = document.getElementById('empty');
const statusFilter = document.getElementById('status-filter');
const showPast = document.getElementById('show-past');

const STATUS_LABEL = { new: 'Новая', confirmed: 'Подтверждена', cancelled: 'Отменена' };

function today() {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

function showMsg(text, type) {
  msgEl.textContent = text;
  msgEl.className = 'msg ' + (type || '');
}

// ===== Вход и выход =====
function showView(session) {
  const loggedIn = Boolean(session);
  loginForm.hidden = loggedIn;
  panel.hidden = !loggedIn;
  if (loggedIn) {
    whoEl.textContent = session.user.email;
    loadBookings();
  } else {
    listEl.innerHTML = '';
  }
}

loginForm.addEventListener('submit', async function (event) {
  event.preventDefault();
  loginMsg.textContent = '';
  const { error } = await db.auth.signInWithPassword({
    email: document.getElementById('email').value.trim(),
    password: document.getElementById('password').value
  });
  if (error) {
    loginMsg.textContent = 'Неверная почта или пароль.';
    loginMsg.className = 'msg error';
  }
});

document.getElementById('logout').addEventListener('click', () => db.auth.signOut());

// setTimeout нужен, чтобы не делать запросы прямо внутри обработчика авторизации
db.auth.onAuthStateChange((event, session) => {
  setTimeout(() => showView(session), 0);
});
db.auth.getSession().then(({ data }) => showView(data.session));

// ===== Загрузка заявок =====
async function loadBookings() {
  let query = db.from('bookings')
    .select('id, client_name, client_phone, booking_date, booking_time, status, services(name)')
    .order('booking_date', { ascending: true })
    .order('booking_time', { ascending: true });

  if (!showPast.checked) query = query.gte('booking_date', today());
  if (statusFilter.value !== 'all') query = query.eq('status', statusFilter.value);

  const { data, error } = await query;
  if (error) {
    console.error(error);
    showMsg('Не удалось загрузить заявки.', 'error');
    return;
  }
  renderBookings(data);
}

statusFilter.addEventListener('change', loadBookings);
showPast.addEventListener('change', loadBookings);

function actionBtn(text, onClick, danger) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'act' + (danger ? ' danger' : '');
  btn.textContent = text;
  btn.addEventListener('click', onClick);
  return btn;
}

function renderBookings(rows) {
  listEl.innerHTML = '';
  emptyEl.hidden = rows.length > 0;

  for (const b of rows) {
    const li = document.createElement('li');
    li.className = 'booking';

    const when = document.createElement('div');
    when.className = 'when';
    when.textContent = `${b.booking_date} · ${b.booking_time.slice(0, 5)}`;
    const badge = document.createElement('span');
    badge.className = 'badge ' + b.status;
    badge.textContent = STATUS_LABEL[b.status] || b.status;
    when.append(badge);

    const meta = document.createElement('div');
    meta.className = 'meta';
    const phone = document.createElement('a');
    phone.href = 'tel:' + b.client_phone.replace(/[^+\d]/g, '');
    phone.textContent = b.client_phone;
    meta.append(`${b.services ? b.services.name : 'Услуга удалена'} · ${b.client_name} · `, phone);

    const actions = document.createElement('div');
    actions.className = 'actions';
    if (b.status !== 'confirmed') actions.append(actionBtn('Подтвердить', () => setStatus(b.id, 'confirmed')));
    if (b.status !== 'cancelled') actions.append(actionBtn('Отменить', () => setStatus(b.id, 'cancelled')));
    actions.append(actionBtn('Удалить', () => removeBooking(b.id), true));

    li.append(when, meta, actions);
    listEl.append(li);
  }
}

// ===== Действия над заявкой =====
async function setStatus(id, status) {
  const { data, error } = await db.from('bookings').update({ status }).eq('id', id).select('id');
  if (error || !data.length) {
    console.error(error);
    showMsg('Не удалось изменить статус (нет прав или заявка не найдена).', 'error');
    return;
  }
  showMsg('Готово.', 'ok');
  loadBookings();
}

async function removeBooking(id) {
  if (!confirm('Удалить заявку навсегда?')) return;
  const { data, error } = await db.from('bookings').delete().eq('id', id).select('id');
  if (error || !data.length) {
    console.error(error);
    showMsg('Не удалось удалить заявку.', 'error');
    return;
  }
  showMsg('Заявка удалена.', 'ok');
  loadBookings();
}