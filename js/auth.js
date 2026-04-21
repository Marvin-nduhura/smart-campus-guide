// Authentication module
const Auth = (() => {
  let currentUser = null;

  function getCurrentUser() {
    if (currentUser) return currentUser;
    const stored = sessionStorage.getItem('ku_user');
    if (stored) { currentUser = JSON.parse(stored); return currentUser; }
    return null;
  }

  function setCurrentUser(user) {
    currentUser = user;
    sessionStorage.setItem('ku_user', JSON.stringify(user));
  }

  function logout() {
    currentUser = null;
    sessionStorage.removeItem('ku_user');
    Router.navigate('login');
  }

  function isAdmin() {
    const u = getCurrentUser();
    return u && (u.role === 'admin' || (u.role === 'student' && u.permissions && u.permissions.includes('admin')));
  }

  function canEdit() {
    const u = getCurrentUser();
    if (!u) return false;
    return u.role === 'admin' || (u.role === 'student' && u.permissions && u.permissions.includes('admin'));
  }

  function isLoggedIn() { return !!getCurrentUser(); }

  async function login(username, password) {
    const users = await DB.dbGetAll(DB.STORES.users);
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
      setCurrentUser(user);
      return { success: true, user };
    }
    return { success: false, message: 'Invalid username or password' };
  }

  async function loginAsVisitor() {
    const visitor = { id: 0, username: 'visitor', role: 'visitor', name: 'Guest Visitor', permissions: [] };
    setCurrentUser(visitor);
    return { success: true, user: visitor };
  }

  function renderLoginPage() {
    return `
    <div class="auth-page">
      <div class="auth-bg-animation">
        <div class="bubble b1"></div><div class="bubble b2"></div>
        <div class="bubble b3"></div><div class="bubble b4"></div>
        <div class="bubble b5"></div>
      </div>
      <div class="auth-container animate-slide-up">
        <div class="auth-logo">
          <div class="logo-circle">
            <i class="fas fa-university"></i>
          </div>
          <h1>Smart Campus Guide</h1>
          <p>Kabale University</p>
        </div>
        <div class="auth-card">
          <div class="auth-tabs">
            <button class="auth-tab active" onclick="Auth.switchTab('login', this)">
              <i class="fas fa-sign-in-alt"></i> Login
            </button>
            <button class="auth-tab" onclick="Auth.switchTab('visitor', this)">
              <i class="fas fa-eye"></i> Visit
            </button>
          </div>
          <div id="login-tab" class="tab-content active">
            <div class="form-group">
              <label><i class="fas fa-user"></i> Username</label>
              <input type="text" id="login-username" placeholder="Enter username" class="form-input" autocomplete="username"/>
            </div>
            <div class="form-group">
              <label><i class="fas fa-lock"></i> Password</label>
              <div class="input-eye-wrap">
                <input type="password" id="login-password" placeholder="Enter password" class="form-input" autocomplete="current-password"/>
                <button class="eye-btn" onclick="Auth.togglePwd()"><i class="fas fa-eye" id="eye-icon"></i></button>
              </div>
            </div>
            <div id="login-error" class="error-msg hidden"></div>
            <button class="btn-primary btn-full" onclick="Auth.handleLogin()">
              <i class="fas fa-sign-in-alt"></i> Sign In
            </button>
            <div class="auth-hint">
              <small><i class="fas fa-info-circle"></i> </small>
            </div>
          </div>
          <div id="visitor-tab" class="tab-content">
            <div class="visitor-info">
              <div class="visitor-icon"><i class="fas fa-map-marked-alt"></i></div>
              <h3>Explore as Visitor</h3>
              <p>Browse campus buildings, view maps and get directions without an account.</p>
              <ul class="visitor-features">
                <li><i class="fas fa-check-circle"></i> View campus map</li>
                <li><i class="fas fa-check-circle"></i> Browse buildings</li>
                <li><i class="fas fa-check-circle"></i> Get directions</li>
                <li><i class="fas fa-times-circle"></i> Book rooms</li>
                <li><i class="fas fa-times-circle"></i> Manage timetable</li>
              </ul>
            </div>
            <button class="btn-secondary btn-full" onclick="Auth.handleVisitor()">
              <i class="fas fa-walking"></i> Continue as Visitor
            </button>
          </div>
        </div>
      </div>
    </div>`;
  }

  function switchTab(tab, btn) {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    const tabEl = document.getElementById(tab + '-tab');
    if (tabEl) tabEl.classList.add('active');
    if (btn) btn.classList.add('active');
  }

  function togglePwd() {
    const inp = document.getElementById('login-password');
    const icon = document.getElementById('eye-icon');
    if (inp.type === 'password') { inp.type = 'text'; icon.className = 'fas fa-eye-slash'; }
    else { inp.type = 'password'; icon.className = 'fas fa-eye'; }
  }

  async function handleLogin() {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const errEl = document.getElementById('login-error');
    if (!username || !password) {
      errEl.textContent = 'Please enter username and password';
      errEl.classList.remove('hidden');
      return;
    }
    const btn = document.querySelector('#login-tab .btn-primary');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';
    btn.disabled = true;
    const result = await login(username, password);
    if (result.success) {
      UI.showToast('Welcome back, ' + result.user.name + '!', 'success');
      setTimeout(() => Router.navigate('dashboard'), 500);
    } else {
      errEl.textContent = result.message;
      errEl.classList.remove('hidden');
      btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
      btn.disabled = false;
    }
  }

  async function handleVisitor() {
    await loginAsVisitor();
    UI.showToast('Welcome, Guest!', 'info');
    setTimeout(() => Router.navigate('dashboard'), 500);
  }

  return { getCurrentUser, logout, isAdmin, canEdit, isLoggedIn, renderLoginPage, switchTab, togglePwd, handleLogin, handleVisitor };
})();

window.Auth = Auth;
