const API = '/api/v1';
const state = { token: localStorage.getItem('financeToken'), login: localStorage.getItem('financeLogin'), wallets: [], operations: [], showAllOperations: false, lastTotalBalance: 0, filter: 'all', sort: 'newest', authMode: 'login', codeRequested: false, resetRequested: false };
const $ = (id) => document.getElementById(id);

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  const response = await fetch(`${API}${path}`, { ...options, headers });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.detail || 'Не удалось выполнить запрос');
  return body;
}

function formatAmount(value) { return Number(value || 0).toLocaleString('ru-RU', { maximumFractionDigits: 2 }); }
function money(value, currency = 'RUB') { return `${formatAmount(value)} ${currency}`; }
function showToast(message, isError = false) { const text = translateError(message); if (!text) return; const toast = $('toast'); toast.textContent = text; toast.style.background = isError ? '#c96552' : '#17231f'; toast.classList.add('visible'); setTimeout(() => toast.classList.remove('visible'), 3200); }
function translateError(message) { const text = String(message || '').trim(); if (!text) return ''; const insufficientFunds = text.match(/(?:Insufficient funds\. Available:|Not enough money:)\s*([\d.,]+)\s*(.*)/i); if (insufficientFunds) return `Недостаточно средств. Доступно: ${formatAmount(insufficientFunds[1].replace(',', '.'))}${insufficientFunds[2] ? ` ${insufficientFunds[2].toUpperCase()}` : ''}`; if (/Unauthorized/i.test(text)) return 'Пользователь не авторизован. Войдите снова.'; if (/Wallet .+ not found/i.test(text)) return 'Кошелёк не найден.'; if (/already exists/i.test(text)) return 'Пользователь с таким логином уже существует.'; if (/Amount must be a positive/i.test(text)) return 'Сумма должна быть больше нуля.'; return text; }
function showApp() { $('authView').classList.add('hidden'); $('appView').classList.remove('hidden'); $('userName').textContent = state.login || 'Пользователь'; $('today').textContent = new Date().toLocaleDateString('ru-RU', { day:'2-digit', month:'short', year:'numeric' }); loadDashboard(); }
function showAuth() { $('authView').classList.remove('hidden'); $('appView').classList.add('hidden'); }
function clearSession() { state.token = null; state.login = null; localStorage.removeItem('financeToken'); localStorage.removeItem('financeLogin'); }

async function authenticate(event) {
  event.preventDefault(); $('authError').textContent = '';
  const login = $('login').value.trim(); const email = $('email').value.trim(); const password = $('password').value;
  try {
    if (state.authMode === 'login') {
      const result = await request('/auth/login', { method:'POST', body:JSON.stringify({ email, password }) });
      await finishAuthentication(result);
      return;
    }
    if (state.authMode === 'reset') {
      if (!state.resetRequested) {
        await request('/auth/request-password-reset', { method:'POST', body:JSON.stringify({ email }) });
        state.resetRequested = true;
        $('codeField').classList.remove('hidden'); $('passwordField').classList.remove('hidden');
        $('password').required = true; $('emailCode').required = true; $('password').value = '';
        $('authSubmit').firstChild.textContent = 'Сменить пароль ';
        $('authNote').textContent = 'Введите код из письма и новый пароль.';
        $('emailCode').focus();
        return;
      }
      await request('/auth/password-reset', { method:'POST', body:JSON.stringify({ email, code:$('emailCode').value.trim(), new_password: password }) });
      setAuthMode('login');
      $('authNote').textContent = 'Пароль успешно изменён. Войдите с новым паролем.';
      $('password').value = ''; $('emailCode').value = '';
      return;
    }
    if (!state.codeRequested) {
      try { await request('/users', { method:'POST', body:JSON.stringify({ login, email }) }); }
      catch (error) { if (!error.message.includes('already exists')) throw error; }
      await request('/auth/request-code', { method:'POST', body:JSON.stringify({ email }) });
      state.codeRequested = true;
      $('loginField').classList.add('hidden'); $('passwordField').classList.remove('hidden'); $('codeField').classList.remove('hidden');
      $('login').required = false; $('email').required = false; $('password').required = true; $('emailCode').required = true;
      $('authSubmit').firstChild.textContent = 'Подтвердить код ';
      $('authNote').textContent = 'Мы отправили код. Придумайте пароль для следующих входов.';
      $('emailCode').focus();
      return;
    }
    const result = await request('/auth/verify-code', { method:'POST', body:JSON.stringify({ email, code:$('emailCode').value.trim(), password }) });
    await finishAuthentication(result);
  } catch (error) { $('authError').textContent = translateError(error.message); }
}

async function finishAuthentication(result) {
  state.token = result.access_token;
  const user = await request('/users/me');
  state.login = user.login;
  localStorage.setItem('financeLogin', user.login); localStorage.setItem('financeToken', result.access_token);
  showApp();
}

function setAuthMode(mode) {
  state.authMode = mode; state.codeRequested = false; state.resetRequested = false; $('authError').textContent = '';
  const isReset = mode === 'reset';
  $('loginMode').classList.toggle('active', mode === 'login'); $('registerMode').classList.toggle('active', mode === 'register');
  $('authTitle').textContent = isReset ? 'Восстановление пароля' : mode === 'login' ? 'Вход по паролю' : 'Регистрация по email';
  $('loginField').classList.toggle('hidden', mode !== 'register'); $('codeField').classList.add('hidden'); $('passwordField').classList.toggle('hidden', mode === 'register' || isReset);
  $('login').required = mode === 'register'; $('email').required = true; $('password').required = mode === 'login'; $('emailCode').required = false;
  $('email').disabled = false;
  $('password').value = ''; $('emailCode').value = '';
  $('authSubmit').firstChild.textContent = isReset ? 'Отправить код ' : mode === 'login' ? 'Войти ' : 'Получить код ';
  $('authNote').textContent = isReset ? 'Укажите email, на который зарегистрирован аккаунт.' : mode === 'login' ? 'Используйте email и пароль, заданный при регистрации.' : 'Для регистрации потребуется одно подтверждение по email.';
  $('forgotPasswordLink').classList.toggle('hidden', isReset);
  $('backToLogin').classList.toggle('hidden', !isReset);
}

function togglePassword() {
  const passwordInput = $('password');
  const toggleButton = $('togglePassword');
  const isVisible = passwordInput.type === 'text';
  passwordInput.type = isVisible ? 'password' : 'text';
  const revealed = !isVisible;
  toggleButton.classList.toggle('revealed', revealed);
  toggleButton.setAttribute('aria-pressed', String(revealed));
  const label = isVisible ? 'Показать пароль' : 'Скрыть пароль';
  toggleButton.setAttribute('aria-label', label);
  toggleButton.title = label;
}

async function loadDashboard() {
  $('activityLoading').classList.remove('hidden'); $('activityList').classList.add('hidden');
  try { [state.wallets, state.operations] = await Promise.all([request('/wallets'), request('/operations')]); const balance = await request('/balance'); render(balance.total_balance); } catch (error) { showToast(error.message, true); } finally { $('activityLoading').classList.add('hidden'); $('activityList').classList.remove('hidden'); }
}
function render(total) {
  state.lastTotalBalance = total;
  $('totalBalance').textContent = money(total); $('walletCount').textContent = state.wallets.length; $('operationCount').textContent = state.operations.length;
  const totalWalletBalance = state.wallets.reduce((sum, wallet) => sum + Number(wallet.balance || 0), 0); $('walletList').innerHTML = state.wallets.map(wallet => { const currency = normalizeCurrency(wallet.currency); const share = totalWalletBalance ? Math.round(Number(wallet.balance || 0) / totalWalletBalance * 100) : 0; return `<div class="wallet-row"><div class="wallet-identity"><span class="currency-mark ${currency.toLowerCase()}" title="Валюта: ${currency}" aria-label="Валюта: ${currency}">${currencySymbol(currency)}</span><div><div class="wallet-name">${escapeHtml(wallet.name)}</div><div class="wallet-currency">${currency} · ${share}% портфеля</div></div></div><div class="wallet-balance">${money(wallet.balance, currency)}</div></div>`; }).join(''); $('walletEmpty').classList.toggle('hidden', state.wallets.length > 0);
  let orderedOperations = state.operations.slice(); if (state.filter !== 'all') orderedOperations = orderedOperations.filter(operation => operation.type === state.filter); if (state.sort === 'oldest') orderedOperations.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)); else if (state.sort === 'largest') orderedOperations.sort((a, b) => Number(b.amount) - Number(a.amount)); else orderedOperations.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); const hasFilteredOperations = orderedOperations.length > 0; const visibleOperations = state.showAllOperations ? orderedOperations : orderedOperations.slice(0, 5); $('activityList').innerHTML = visibleOperations.map(operation => { const expense = operation.type === 'expense'; const transfer = operation.type === 'transfer'; const operationMark = transfer ? '↔' : expense ? '−' : '+'; const operationClass = transfer ? 'transfer' : expense ? 'expense' : ''; const operationTitle = operation.description || (transfer ? 'Перевод' : expense ? 'Расход' : 'Доход'); return `<div class="activity-row"><div class="activity-left"><div class="activity-icon ${operationClass}">${operationMark}</div><div><div class="activity-title">${escapeHtml(operationTitle)}</div><div class="activity-date">${new Date(operation.created_at).toLocaleDateString('ru-RU')} · ${operation.currency}</div></div></div><div class="activity-amount ${operationClass}">${expense ? '−' : '+'}${money(operation.amount, operation.currency)}</div></div>`; }).join(''); $('activityEmpty').classList.toggle('hidden', state.operations.length > 0); $('activityFilteredEmpty').classList.toggle('hidden', state.operations.length === 0 || hasFilteredOperations); const activityToggle = $('activityToggle'); activityToggle.classList.toggle('hidden', orderedOperations.length <= 5); activityToggle.textContent = state.showAllOperations ? 'Свернуть операции' : 'Показать все операции'; renderChart(); fillWalletSelects();
}
function normalizeCurrency(currency) { return String(currency || 'RUB').toUpperCase(); }
function currencySymbol(currency) { const normalizedCurrency = normalizeCurrency(currency); return normalizedCurrency === 'USD' ? '$' : normalizedCurrency === 'EUR' ? '€' : '₽'; }
function renderChart() { const chart = $('flowChart'); const groups = new Map(); state.operations.forEach(operation => { if (operation.type !== 'income' && operation.type !== 'expense') return; const date = new Date(operation.created_at); const currency = normalizeCurrency(operation.currency); const dateKey = date.toISOString().slice(0, 10); const key = `${dateKey}-${currency}`; if (!groups.has(key)) groups.set(key, { date, currency, income: 0, expense: 0 }); groups.get(key)[operation.type] += Number(operation.amount) || 0; }); const rows = [...groups.values()].sort((a, b) => b.date - a.date).slice(0, 7); if (!rows.length) { chart.innerHTML = '<span class="chart-empty">Здесь появится динамика после первой операции</span>'; return; } const max = Math.max(...rows.flatMap(row => [row.income, row.expense]), 1); chart.innerHTML = rows.map(row => { const incomeWidth = row.income ? Math.max(8, Math.round(row.income / max * 100)) : 0; const expenseWidth = row.expense ? Math.max(8, Math.round(row.expense / max * 100)) : 0; const dateLabel = row.date.toLocaleDateString('ru-RU', { day:'2-digit', month:'short' }); const currencyMark = currencySymbol(row.currency); return `<div class="flow-row"><div class="flow-row-head"><strong>${dateLabel}</strong><span>${row.currency}</span></div><div class="flow-line"><span class="flow-line-label">Доходы</span><div class="flow-track">${row.income ? `<div class="flow-fill income" style="width:${incomeWidth}%"></div>` : ''}</div><b class="flow-value income-text">${row.income ? `+${formatAmount(row.income)} ${currencyMark}` : '—'}</b></div><div class="flow-line"><span class="flow-line-label">Расходы</span><div class="flow-track">${row.expense ? `<div class="flow-fill expense" style="width:${expenseWidth}%"></div>` : ''}</div><b class="flow-value expense-text">${row.expense ? `−${formatAmount(row.expense)} ${currencyMark}` : '—'}</b></div></div>`; }).join(''); }
function fillWalletSelects() { const options = state.wallets.map(wallet => `<option value="${wallet.id}">${escapeHtml(wallet.name)} · ${wallet.currency}</option>`).join(''); ['operationWallet','fromWallet','toWallet'].forEach(id => $(id).innerHTML = options); }
function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#039;', '"':'&quot;' }[character])); }

async function submitOperation(event) { event.preventDefault(); try { await request(`/operation/${$('operationType').value}`, { method:'POST', body:JSON.stringify({ wallet_name: state.wallets.find(wallet => wallet.id === Number($('operationWallet').value)).name, amount: Number($('operationAmount').value), description: $('operationDescription').value || null }) }); event.target.reset(); showToast('Операция сохранена'); loadDashboard(); } catch (error) { showToast(error.message, true); } }
async function submitTransfer(event) { event.preventDefault(); try { await request('/operations/transfer', { method:'POST', body:JSON.stringify({ from_wallet_id:Number($('fromWallet').value), to_wallet_id:Number($('toWallet').value), amount:Number($('transferAmount').value) }) }); event.target.reset(); showToast('Перевод выполнен'); loadDashboard(); } catch (error) { showToast(error.message, true); } }
async function createWallet(event) { event.preventDefault(); try { await request('/wallets', { method:'POST', body:JSON.stringify({ name:$('walletName').value.trim(), initial_balance:Number($('walletBalance').value), currency:$('walletCurrency').value }) }); $('walletModal').close(); event.target.reset(); showToast('Кошелёк создан'); loadDashboard(); } catch (error) { showToast(error.message, true); } }

 $('authForm').addEventListener('submit', authenticate); $('loginMode').addEventListener('click', () => setAuthMode('login')); $('registerMode').addEventListener('click', () => setAuthMode('register')); $('forgotPasswordLink').addEventListener('click', () => setAuthMode('reset')); $('backToLogin').addEventListener('click', () => setAuthMode('login')); $('togglePassword').addEventListener('click', togglePassword); $('operationForm').addEventListener('submit', submitOperation); $('transferForm').addEventListener('submit', submitTransfer); $('walletForm').addEventListener('submit', createWallet); $('refreshButton').addEventListener('click', loadDashboard); $('openWalletModal').addEventListener('click', () => $('walletModal').showModal()); $('closeWalletModal').addEventListener('click', () => $('walletModal').close()); $('logoutButton').addEventListener('click', () => { clearSession(); location.reload(); });
 $('activityToggle').addEventListener('click', () => { state.showAllOperations = !state.showAllOperations; render(state.lastTotalBalance); }); $('activityFilter').addEventListener('change', event => { state.filter = event.target.value; state.showAllOperations = false; render(state.lastTotalBalance); }); $('activitySort').addEventListener('change', event => { state.sort = event.target.value; render(state.lastTotalBalance); }); $('mobileRefresh').addEventListener('click', loadDashboard);
async function restoreSession() {
  if (!state.token) return showAuth();
  try { const user = await request('/users/me'); state.login = user.login; localStorage.setItem('financeLogin', user.login); showApp(); }
  catch { clearSession(); showAuth(); }
}
restoreSession();