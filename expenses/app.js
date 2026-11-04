const CURRENCY = 'EUR';

const STORAGE_KEY = 'expenses-v1';
function loadExpenses() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const data = raw ? JSON.parse(raw) : [];
        return Array.isArray(data) ? data : [];
    }
    catch (error) {
        console.error('Не удалось прочитать данные', error);
        return [];
    }
}
function saveExpenses() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
    }
    catch (error) {
        console.error('Не удалось сохранить данные', error);
    }
}
let expenses = loadExpenses();

const form = document.getElementById('expense-form');
const amountInput = document.getElementById('amount');
const categoryInput = document.getElementById('category');
const dateInput = document.getElementById('date');
const noteInput = document.getElementById('note');
const listEl = document.getElementById('list');
const emptyEl = document.getElementById('empty');
const totalEl = document.getElementById('total');
const catEl = document.getElementById('by-category');
const monthEl = document.getElementById('month-filter');
let selectedMonth = 'all';

function today() {
    const d = new Date();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${month}-${day}`;
}

dateInput.value = today();

function formatMoney(n) {
    return n.toFixed(2) + ' ' + CURRENCY;
}

function monthName(key) {
    const [y, m] = key.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
}

function updateMonthOptions() {
    const months = [...new Set(expenses.map(e => e.date.slice(0, 7)))].sort().reverse();
    if (selectedMonth !== 'all' && !months.includes(selectedMonth)) selectedMonth = 'all';

    monthEl.innerHTML = '';
    monthEl.append(new Option('Все месяцы', 'all'));
    for (const m of months) monthEl.append(new Option(monthName(m), m));
    monthEl.value = selectedMonth;
}

monthEl.addEventListener('change', function () {
    selectedMonth = monthEl.value;
    render();
});

function render() {
    updateMonthOptions();
    const visible = selectedMonth === 'all'
        ? expenses
        : expenses.filter(e => e.date.startsWith(selectedMonth));
    listEl.innerHTML = '';
    const sorted = [...visible].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
    for(const e of sorted){
        const li = document.createElement('li');
        li.className = 'item';
        const info = document.createElement('div');
        const title = document.createElement('strong');
        title.textContent = e.category;
        const small = document.createElement('small');
        small.textContent = e.note ? `${e.date} · ${e.note}` : e.date;
        info.append(title, small);
        const amount = document.createElement('span');
        amount.textContent = formatMoney(e.amount);
        const del = document.createElement('button');
        del.className = 'del';
        del.dataset.id = e.id;
        del.setAttribute('aria-label', 'Удалить');
        del.textContent = 'X';
        li.append(info, amount, del);
        listEl.append(li);
    }
    emptyEl.hidden = visible.length > 0;
    const total = visible.reduce((sum, e) => sum + e.amount, 0);
    totalEl.textContent = formatMoney(total);
    const byCategory = {};
    for (const e of visible) {
        byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
    }
    catEl.innerHTML = '';
    const entries = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
    for (const [name, sum] of entries) {
        const li = document.createElement('li');
        const row = document.createElement('div');
        row.className = 'row';
        const label = document.createElement('span');
        label.textContent = name;
        const value = document.createElement('span');
        value.textContent = `${formatMoney(sum)} · ${Math.round(sum / total * 100)}%`;
        row.append(label, value);
        const bar = document.createElement('div');
        bar.className = 'bar';
        const fill = document.createElement('i');
        fill.style.width = `${sum / total * 100}%`;
        bar.append(fill);
        li.append(row, bar);
        catEl.append(li);
  }
}
form.addEventListener('submit', function(event){
    event.preventDefault();
    const expense = {
        id: Date.now(),
        amount: Number(amountInput.value),
        category: categoryInput.value,
        date: dateInput.value,
        note: noteInput.value.trim()
    };
    expenses.push(expense);
    saveExpenses();
    form.reset();
    dateInput.value = today();
    amountInput.focus();
    render();
});
listEl.addEventListener('click', function(event){
    const button = event.target.closest('.del');
    if (!button) return;
    const id = Number(button.dataset.id);
    expenses = expenses.filter(e => e.id !== id);
    saveExpenses();
    render();
});
render();