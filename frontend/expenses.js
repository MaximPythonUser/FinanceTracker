/* ============================================================
   expenses.js — страница «Операции»
   Палитра: тёмно-зелёный, приглушённый зелёный, серый
   ============================================================ */

const API = '/api/v1';
const $ = (id) => document.getElementById(id);

// ---------- состояние ----------
const state = {
  token: localStorage.getItem('financeToken'),
  login: localStorage.getItem('financeLogin'),
  wallets: [],
  operations: [],
  days: 30,
  walletFilter: 'all',
  excludeTransfers: false,
  searchQuery: '',
};

// ---------- палитра (единая с главной страницей) ----------
const PALETTE = {
  dark:    '#1C2521',
  green:   '#78a88b',
  greenLt: '#b8d4c4',
  gray:    '#d6e1d9',
  grayLt:  '#edecea',
  red:     '#c96552',
  orange:  '#f3a36b',
};

// ---------- утилиты ----------
function formatAmount(value) {
  return Number(value || 0).toLocaleString('ru-RU', { maximumFractionDigits: 2 });
}
function money(value, currency = 'RUB') {
  return `${formatAmount(value)} ${currency}`;
}
function currencySymbol(currency) {
  const c = String(currency || 'RUB').toUpperCase();
  return c === 'USD' ? '$' : c === 'EUR' ? '€' : '₽';
}
function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, ch => ({
    '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'
  }[ch]));
}
function formatDateRu(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}
function getDaysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

// ---------- API ----------
async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  const response = await fetch(`${API}${path}`, { ...options, headers });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.detail || 'Не удалось выполнить запрос');
  return body;
}

// ---------- моковые данные ----------
const MOCK_OPERATIONS = [
  { id: 1, wallet_id: 1, type: 'expense', amount: 13902, currency: 'RUB', description: 'Авиабилеты Москва—Сочи', created_at: '2026-09-20T14:30:00' },
  { id: 2, wallet_id: 1, type: 'expense', amount: 2450, currency: 'RUB', description: 'Продукты в Перекрёстке', created_at: '2026-09-21T10:15:00' },
  { id: 3, wallet_id: 1, type: 'expense', amount: 890, currency: 'RUB', description: 'Кофе и круассан', created_at: '2026-09-21T16:45:00' },
  { id: 4, wallet_id: 2, type: 'income', amount: 85000, currency: 'RUB', description: 'Зарплата', created_at: '2026-09-15T09:00:00' },
  { id: 5, wallet_id: 1, type: 'expense', amount: 3200, currency: 'RUB', description: 'Подписка Яндекс Плюс', created_at: '2026-09-18T12:00:00' },
  { id: 6, wallet_id: 2, type: 'expense', amount: 15000, currency: 'USD', description: 'Оплата хостинга', created_at: '2026-09-19T11:00:00' },
  { id: 7, wallet_id: 1, type: 'transfer', amount: 5000, currency: 'RUB', description: 'перевод', created_at: '2026-09-22T08:00:00' },
  { id: 8, wallet_id: 1, type: 'expense', amount: 4200, currency: 'RUB', description: 'Ресторан «Пушкин»', created_at: '2026-09-23T19:30:00' },
  { id: 9, wallet_id: 1, type: 'expense', amount: 670, currency: 'RUB', description: 'Такси', created_at: '2026-09-23T22:10:00' },
  { id: 10, wallet_id: 2, type: 'income', amount: 12000, currency: 'USD', description: 'Фриланс проект', created_at: '2026-09-24T15:00:00' },
  { id: 11, wallet_id: 1, type: 'expense', amount: 1800, currency: 'RUB', description: 'Аптека', created_at: '2026-09-25T10:30:00' },
  { id: 12, wallet_id: 1, type: 'expense', amount: 9500, currency: 'RUB', description: 'Новый телефон', created_at: '2026-09-26T14:00:00' },
  { id: 13, wallet_id: 1, type: 'expense', amount: 340, currency: 'RUB', description: 'Метро', created_at: '2026-09-27T08:20:00' },
  { id: 14, wallet_id: 2, type: 'expense', amount: 280, currency: 'EUR', description: 'Ужин в Париже', created_at: '2026-09-27T20:00:00' },
  { id: 15, wallet_id: 1, type: 'income', amount: 5000, currency: 'RUB', description: 'Кэшбэк за сентябрь', created_at: '2026-09-28T10:00:00' },
];

// ---------- иконки по типу ----------
const TYPE_CONFIG = {
  income:  { emoji: '↓', label: 'Доход',   color: '#30d158' },
  expense: { emoji: '↑', label: 'Расход',  color: '#c96552' },
  transfer:{ emoji: '↔', label: 'Перевод', color: '#f3a36b' },
};

// ---------- фильтрация ----------
function getFilteredOperations() {
  let ops = [...state.operations];

  const since = getDaysAgo(state.days);
  ops = ops.filter(o => new Date(o.created_at) >= new Date(since));

  if (state.excludeTransfers) {
    ops = ops.filter(o => o.type !== 'transfer');
  }

  if (state.walletFilter !== 'all') {
    ops = ops.filter(o => o.wallet_id === Number(state.walletFilter));
  }

  if (state.searchQuery.trim()) {
    const q = state.searchQuery.toLowerCase();
    ops = ops.filter(o =>
      (o.description || '').toLowerCase().includes(q) ||
      getWalletName(o.wallet_id).toLowerCase().includes(q)
    );
  }

  ops.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return ops;
}

function getWalletName(walletId) {
  const w = state.wallets.find(w => w.id === walletId);
  return w ? w.name : '—';
}

// ---------- рендер статистики ----------
function renderStats(operations) {
  const totalExpense = operations
    .filter(o => o.type === 'expense')
    .reduce((sum, o) => sum + Number(o.amount), 0);

  $('totalSpent').textContent = `${formatAmount(totalExpense)} ${currencySymbol('RUB')}`;
  $('chartCenterLabel').innerHTML = `<span class="amount">${formatAmount(totalExpense)}</span><span class="label">Траты</span>`;

  $('infoBanner').classList.toggle('hidden', operations.length > 0);
  $('emptyState').classList.toggle('hidden', operations.length > 0);
}

// ---------- рендер кольцевой диаграммы ----------
let doughnutChart = null;

function renderDoughnut(operations) {
  const expenses = operations.filter(o => o.type === 'expense');

  const grouped = new Map();
  expenses.forEach(o => {
    const cat = o.description || 'Без категории';
    if (!grouped.has(cat)) grouped.set(cat, 0);
    grouped.set(cat, grouped.get(cat) + Number(o.amount));
  });

  const labels = [...grouped.keys()];
  const data = [...grouped.values()];
  const total = data.reduce((s, v) => s + v, 0);

  // Палитра: тёмно-зелёный → приглушённый зелёный → серый
  const colors = [
    PALETTE.dark,
    PALETTE.green,
    PALETTE.greenLt,
    PALETTE.gray,
    '#a7c8a9',
    '#8fa898',
    '#c5d6ca',
    PALETTE.gray,
  ];

  if (doughnutChart) doughnutChart.destroy();

  const ctx = $('doughnutChart').getContext('2d');

  const chartData = total > 0 ? data : [1];
  const chartLabels = total > 0 ? labels : ['Нет данных'];
  const chartColors = total > 0 ? colors.slice(0, labels.length) : [PALETTE.grayLt];

  doughnutChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: chartLabels,
      datasets: [{
        data: chartData,
        backgroundColor: chartColors,
        borderColor: '#FFFFFF',   // тонкая белая обводка
        borderWidth: 1,           // вместо 3
        hoverBorderColor: '#FFFFFF',
        hoverOffset: 6,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      cutout: '72%',
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: total > 0,
          backgroundColor: '#1C2521',
          titleColor: '#FFFFFF',
          bodyColor: '#b8d4c4',
          borderColor: '#78a88b',
          borderWidth: 1,
          cornerRadius: 10,
          padding: 12,
          callbacks: {
            label: function(ctx) {
              const val = ctx.parsed;
              const pct = total > 0 ? Math.round(val / total * 100) : 0;
              return ` ${formatAmount(val)} ₽  (${pct}%)`;
            },
          },
        },
      },
      animation: {
        animateRotate: true,
        duration: 800,
        easing: 'easeOutQuart',
      },
    },
  });
}

// ---------- рендер категорий ----------
function renderCategories(operations) {
  const expenses = operations.filter(o => o.type === 'expense');
  const grouped = new Map();
  expenses.forEach(o => {
    const cat = o.description || 'Без категории';
    if (!grouped.has(cat)) grouped.set(cat, 0);
    grouped.set(cat, grouped.get(cat) + Number(o.amount));
  });

  const total = [...grouped.values()].reduce((s, v) => s + v, 0);
  const sorted = [...grouped.entries()].sort((a, b) => b[1] - a[1]);

  // Та же палитра
  const colors = [
    PALETTE.dark,
    PALETTE.green,
    PALETTE.greenLt,
    PALETTE.gray,
    '#a7c8a9',
    '#8fa898',
  ];

  $('categoriesList').innerHTML = sorted.map(([name, amount], i) => {
    const pct = total > 0 ? Math.round(amount / total * 100) : 0;
    const color = colors[i % colors.length];
    return `
      <div class="category-item">
        <div class="category-icon" style="background:${color}22;color:${color}">
          ↑
        </div>
        <div class="category-info">
          <div class="category-name">${escapeHtml(name)}</div>
          <div class="category-bar-track">
            <div class="category-bar-fill" style="width:${pct}%;background:${color}"></div>
          </div>
        </div>
        <div>
          <span class="category-amount">${formatAmount(amount)} ₽</span>
          <span class="category-percent">${pct}%</span>
        </div>
      </div>
    `;
  }).join('');

  $('categoriesSection').classList.toggle('hidden', sorted.length === 0);
}

// ---------- рендер списка транзакций ----------
function renderTransactions(operations) {
  if (operations.length === 0) {
    $('transactionsList').innerHTML = '';
    return;
  }

  const groups = new Map();
  operations.forEach(o => {
    const dateKey = formatDateRu(o.created_at);
    if (!groups.has(dateKey)) groups.set(dateKey, []);
    groups.get(dateKey).push(o);
  });

  let html = '';
  groups.forEach((ops, date) => {
    html += `<div class="group-date">${date}</div>`;
    html += ops.map(o => {
      const cfg = TYPE_CONFIG[o.type] || TYPE_CONFIG.expense;
      const walletName = getWalletName(o.wallet_id);
      const sign = o.type === 'expense' ? '−' : o.type === 'income' ? '+' : '↔';
      const dateStr = new Date(o.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
      return `
        <div class="transaction-item">
          <div class="tx-icon ${o.type}">${cfg.emoji}</div>
          <div class="tx-info">
            <div class="tx-title">${escapeHtml(o.description || cfg.label)}</div>
            <div class="tx-subtitle">${escapeHtml(walletName)} · ${o.currency}</div>
          </div>
          <div class="tx-right">
            <div class="tx-amount ${o.type}">${sign}${formatAmount(o.amount)} ${o.currency}</div>
            <div class="tx-date">${dateStr}</div>
          </div>
        </div>
      `;
    }).join('');
  });

  $('transactionsList').innerHTML = html;
}

// ---------- полный рендер ----------
function render() {
  const filtered = getFilteredOperations();
  renderStats(filtered);
  renderDoughnut(filtered);
  renderCategories(filtered);
  renderTransactions(filtered);
}

// ---------- загрузка данных ----------
async function loadDashboard() {
  try {
    [state.wallets, state.operations] = await Promise.all([
      request('/wallets'),
      request('/operations'),
    ]);
    render();
  } catch (error) {
    console.warn('API недоступен, используем моковые данные:', error.message);
    state.wallets = [
      { id: 1, name: 'Основной RUB', balance: 45230, currency: 'RUB' },
      { id: 2, name: 'Сбережения USD', balance: 1200, currency: 'USD' },
    ];
    state.operations = MOCK_OPERATIONS;
    render();
  }
}

// ---------- инициализация ----------
function init() {
  if (!state.token) {
    console.warn('Нет токена авторизации. Перенаправляю на главную.');
    window.location.href = '/static/index.html';
    return;
  }

  // Фильтры-пилюли
  document.querySelectorAll('.filter-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      if (pill.dataset.period) {
        document.querySelectorAll('.filter-pill[data-period]').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        const map = { week: 7, month: 30, year: 365 };
        state.days = map[pill.dataset.period] || 30;
      }

      if (pill.dataset.wallet !== undefined) {
        pill.classList.toggle('active');
        state.walletFilter = pill.classList.contains('active') ? pill.dataset.wallet : 'all';
      }

      if (pill.dataset.transfers !== undefined) {
        pill.classList.toggle('active');
        state.excludeTransfers = pill.classList.contains('active');
      }

      render();
    });
  });

  // Поиск с debounce
  let searchTimer = null;
  $('searchInput').addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.searchQuery = e.target.value;
      render();
    }, 300);
  });

  // Кнопка статистики — плавный скролл
  $('statsToggle').addEventListener('click', () => {
    $('statsBlock').scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  loadDashboard();
}

document.addEventListener('DOMContentLoaded', init);