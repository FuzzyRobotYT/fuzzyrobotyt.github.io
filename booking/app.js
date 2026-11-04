const SUPABASE_URL = 'https://muvdysgfzpeesohiwfrc.supabase.co';
const SUPABASE_KEY = 'sb_publishable_WfkSjP57epCdmBq8IuBoJA_KBOlay5h';
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const CURRENCY = 'EUR';

const form = document.getElementById('booking-form');
const serviceEl = document.getElementById('service');
const dateEl = document.getElementById('date');
const slotsEl = document.getElementById('slots');
const nameEl = document.getElementById('name');
const phoneEl = document.getElementById('phone');
const honeypot = document.getElementById('website');
const sendBtn = document.getElementById('send');
const msgEl = document.getElementById('msg');

const SLOTS = [];
for (let h = 10; h < 18; h++) {
  const hh = String(h).padStart(2, '0');
  SLOTS.push(`${hh}:00`, `${hh}:30`);
}
let selectedSlot = null;

function today() {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

function showMessage(text, type) {
  msgEl.textContent = text;
  msgEl.className = 'msg ' + (type || '');
}

async function loadServices() {
  const { data, error } = await db.from('services').select('id, name, duration_min, price').order('id');
  if (error) {
    console.error(error);
    showMessage('Не удалось загрузить услуги. Попробуй позже.', 'error');
    return;
  }
  serviceEl.innerHTML = '';
  for (const s of data) {
    serviceEl.append(new Option(`${s.name} (${s.duration_min} мин, ${s.price} ${CURRENCY})`, s.id));
  }
}

async function loadSlots() {
  slotsEl.innerHTML = '';
  selectedSlot = null;
  if (!dateEl.value) {
    slotsEl.textContent = 'Сначала выбери дату.';
    return;
  }

  const { data, error } = await db.rpc('taken_slots', { day: dateEl.value });
  if (error) {
    console.error(error);
    showMessage('Не удалось загрузить время.', 'error');
    return;
  }

  const taken = new Set(data.map(row => row.slot.slice(0, 5)));
  const now = new Date();
  const nowTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const isToday = dateEl.value === today();

  for (const time of SLOTS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'slot';
    btn.textContent = time;
    btn.disabled = taken.has(time) || (isToday && time <= nowTime);
    btn.addEventListener('click', () => {
      selectedSlot = time;
      for (const b of slotsEl.children) b.classList.toggle('active', b === btn);
    });
    slotsEl.append(btn);
  }
}
dateEl.addEventListener('change', loadSlots);

form.addEventListener('submit', async function (event) {
  event.preventDefault();
  if (honeypot.value) return;
  showMessage('');

  const name = nameEl.value.trim();
  const phone = phoneEl.value.trim();
  if (name.length < 2) return showMessage('Введи имя (минимум 2 буквы).', 'error');
  if (!/^[+0-9\s()-]{5,30}$/.test(phone)) return showMessage('Проверь номер телефона.', 'error');
  if (!selectedSlot) return showMessage('Выбери время.', 'error');

  sendBtn.disabled = true;
  const { error } = await db.from('bookings').insert({
    service_id: Number(serviceEl.value),
    client_name: name,
    client_phone: phone,
    booking_date: dateEl.value,
    booking_time: selectedSlot
  });
  sendBtn.disabled = false;

  if (error) {
    console.error(error);
    if (error.code === '23505') {
      showMessage('Это время уже заняли. Выбери другое.', 'error');
      loadSlots();
    } else {
      showMessage('Не удалось отправить заявку. Попробуй позже.', 'error');
    }
    return;
  }

  showMessage(`Готово! Ты записан(а) на ${dateEl.value} в ${selectedSlot}.`, 'ok');
  nameEl.value = '';
  phoneEl.value = '';
  loadSlots();
});

dateEl.min = today();
dateEl.value = today();
loadServices();
loadSlots();