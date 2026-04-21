// UI helpers & shared components
const UI = (() => {
  function renderNav(active) {
    const user = Auth.getCurrentUser();
    if (!user) return '';
    const roleColor = { admin: '#C62828', student: '#0D47A1', visitor: '#546E7A' };
    const color = roleColor[user.role] || '#0D47A1';
    return `
    <nav class="top-nav" style="--nav-color:${color}">
      <div class="nav-left">
        <button class="hamburger" onclick="UI.toggleSidebar()"><i class="fas fa-bars"></i></button>
        <div class="nav-brand" onclick="Router.navigate('dashboard')" style="cursor:pointer" title="Go to Dashboard">
          <div class="nav-logo"><i class="fas fa-university"></i></div>
          <div class="nav-title-wrap">
            <span class="nav-title">Smart Campus</span>
            <span class="nav-sub">Kabale University</span>
          </div>
        </div>
      </div>
      <div class="nav-right">
        <button class="nav-icon-btn" onclick="Router.navigate('search')" title="Search">
          <i class="fas fa-search"></i>
        </button>
        <button class="nav-icon-btn notif-btn" onclick="Router.navigate('notifications')" title="Notifications">
          <i class="fas fa-bell"></i>
          <span class="notif-badge" style="display:none"></span>
        </button>
        <button class="nav-icon-btn install-nav-btn" id="install-nav-btn" onclick="UI.promptInstall()" title="Install App">
          <i class="fas fa-download"></i>
        </button>
        <div class="nav-avatar" onclick="UI.toggleUserMenu()" style="background:${color}">
          ${user.name ? user.name.charAt(0).toUpperCase() : 'U'}
        </div>
      </div>
    </nav>
    <div class="user-menu hidden" id="user-menu">
      <div class="user-menu-header" style="background:${color}">
        <div class="user-menu-avatar">${user.name ? user.name.charAt(0).toUpperCase() : 'U'}</div>
        <div>
          <strong>${user.name}</strong>
          <span class="role-badge">${user.role}</span>
        </div>
      </div>
      <div class="user-menu-items">
        <button onclick="Router.navigate('profile');UI.toggleUserMenu()"><i class="fas fa-user-circle"></i> Profile</button>
        ${Auth.isAdmin() ? `<button onclick="Router.navigate('admin');UI.toggleUserMenu()"><i class="fas fa-cog"></i> Admin Panel</button>` : ''}
        <button class="install-menu-btn" id="install-menu-btn" onclick="UI.promptInstall();UI.toggleUserMenu()"><i class="fas fa-download"></i> Install App</button>
        <button onclick="Auth.logout()" class="logout-btn"><i class="fas fa-sign-out-alt"></i> Logout</button>
      </div>
    </div>
    <div class="sidebar hidden" id="sidebar">
      <div class="sidebar-header" style="background:${color}">
        <div class="sidebar-logo"><i class="fas fa-university"></i></div>
        <div>
          <h3>Smart Campus Guide</h3>
          <p>Kabale University</p>
        </div>
        <button class="sidebar-close" onclick="UI.toggleSidebar()"><i class="fas fa-times"></i></button>
      </div>
      <div class="sidebar-nav">
        <a class="sidebar-link ${active==='dashboard'?'active':''}" onclick="Router.navigate('dashboard');UI.toggleSidebar()">
          <i class="fas fa-home"></i> Dashboard
        </a>
        <a class="sidebar-link ${active==='map'?'active':''}" onclick="Router.navigate('map');UI.toggleSidebar()">
          <i class="fas fa-map-marked-alt"></i> Campus Map
        </a>
        <a class="sidebar-link ${active==='buildings'?'active':''}" onclick="Router.navigate('buildings');UI.toggleSidebar()">
          <i class="fas fa-building"></i> Buildings
        </a>
        ${user.role !== 'visitor' ? `
        <a class="sidebar-link ${active==='bookings'?'active':''}" onclick="Router.navigate('bookings');UI.toggleSidebar()">
          <i class="fas fa-calendar-alt"></i> Bookings
        </a>
        <a class="sidebar-link ${active==='timetable'?'active':''}" onclick="Router.navigate('timetable');UI.toggleSidebar()">
          <i class="fas fa-calendar-week"></i> Timetable
        </a>` : ''}
        <a class="sidebar-link ${active==='notifications'?'active':''}" onclick="Router.navigate('notifications');UI.toggleSidebar()">
          <i class="fas fa-bell"></i> Notifications
        </a>
        ${Auth.isAdmin() ? `
        <a class="sidebar-link ${active==='admin'?'active':''}" onclick="Router.navigate('admin');UI.toggleSidebar()">
          <i class="fas fa-cog"></i> Admin Panel
        </a>` : ''}
        <a class="sidebar-link install-sidebar-btn" id="install-sidebar-btn" onclick="UI.promptInstall();UI.toggleSidebar()">
          <i class="fas fa-download"></i> Install App
        </a>
      </div>
      <div class="sidebar-footer">
        <button class="sidebar-logout" onclick="Auth.logout()"><i class="fas fa-sign-out-alt"></i> Logout</button>
      </div>
    </div>
    <div class="sidebar-overlay hidden" id="sidebar-overlay" onclick="UI.toggleSidebar()"></div>`;
  }

  function renderBottomNav(active) {
    const user = Auth.getCurrentUser();
    if (!user) return '';
    return `
    <nav class="bottom-nav">
      <button class="bnav-btn ${active==='dashboard'?'active':''}" onclick="Router.navigate('dashboard')">
        <i class="fas fa-home"></i><span>Home</span>
      </button>
      <button class="bnav-btn ${active==='map'?'active':''}" onclick="Router.navigate('map')">
        <i class="fas fa-map-marked-alt"></i><span>Map</span>
      </button>
      <button class="bnav-btn ${active==='buildings'?'active':''}" onclick="Router.navigate('buildings')">
        <i class="fas fa-building"></i><span>Buildings</span>
      </button>
      ${user.role !== 'visitor' ? `
      <button class="bnav-btn ${active==='bookings'?'active':''}" onclick="Router.navigate('bookings')">
        <i class="fas fa-calendar-alt"></i><span>Bookings</span>
      </button>
      <button class="bnav-btn ${active==='timetable'?'active':''}" onclick="Router.navigate('timetable')">
        <i class="fas fa-calendar-week"></i><span>Timetable</span>
      </button>` : ''}
      <button class="bnav-btn ${active==='notifications'?'active':''}" onclick="Router.navigate('notifications')">
        <i class="fas fa-bell"></i><span>Alerts</span>
      </button>
    </nav>`;
  }

  function toggleSidebar() {
    const sb = document.getElementById('sidebar');
    const ov = document.getElementById('sidebar-overlay');
    if (!sb) return;
    const isOpen = sb.classList.contains('open');
    if (isOpen) {
      sb.classList.remove('open');
      sb.classList.add('hidden');
      if (ov) ov.classList.add('hidden');
    } else {
      sb.classList.remove('hidden');
      sb.classList.add('open');
      if (ov) ov.classList.remove('hidden');
    }
  }

  function toggleUserMenu() {
    const menu = document.getElementById('user-menu');
    if (!menu) return;
    const isHidden = menu.classList.contains('hidden');
    if (isHidden) {
      menu.classList.remove('hidden');
      // Single outside-click handler
      setTimeout(() => {
        function outsideClick(e) {
          if (!e.target.closest('#user-menu') && !e.target.closest('.nav-avatar')) {
            menu.classList.add('hidden');
            document.removeEventListener('click', outsideClick);
          }
        }
        document.addEventListener('click', outsideClick);
      }, 0);
    } else {
      menu.classList.add('hidden');
    }
  }

  function showModal({ title, body, onConfirm, confirmText = '<i class="fas fa-check"></i> Save', cancelText = '<i class="fas fa-times"></i> Cancel' }) {
    const existing = document.getElementById('modal-overlay');
    if (existing) existing.remove();
    const overlay = document.createElement('div');
    overlay.id = 'modal-overlay';
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
    <div class="modal animate-scale-in">
      <div class="modal-header">
        <h3>${title}</h3>
        <button class="modal-close" onclick="UI.closeModal()"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body">${body}</div>
      <div class="modal-footer">
        <button class="btn-secondary" onclick="UI.closeModal()">${cancelText}</button>
        <button class="btn-primary" id="modal-confirm-btn" onclick="UI.handleModalConfirm()">${confirmText}</button>
      </div>
    </div>`;
    document.body.appendChild(overlay);
    window._modalConfirm = onConfirm;
    setTimeout(() => overlay.classList.add('visible'), 10);
  }

  async function handleModalConfirm() {
    const btn = document.getElementById('modal-confirm-btn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...'; }
    if (window._modalConfirm) {
      const result = await window._modalConfirm();
      if (result !== false) closeModal();
      else if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-check"></i> Save'; }
    }
  }

  function closeModal() {
    const overlay = document.getElementById('modal-overlay');
    if (!overlay) return;
    overlay.classList.remove('visible');
    // Use transitionend for clean removal instead of a fixed timeout
    const cleanup = () => {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      overlay.removeEventListener('transitionend', cleanup);
    };
    overlay.addEventListener('transitionend', cleanup);
    // Fallback in case transitionend doesn't fire
    setTimeout(cleanup, 350);
  }

  function showConfirm(message, onConfirm) {
    showModal({
      title: '<i class="fas fa-exclamation-triangle" style="color:#e53935"></i> Confirm',
      body: `<p style="text-align:center;font-size:1rem;padding:1rem 0">${message}</p>`,
      confirmText: '<i class="fas fa-trash"></i> Confirm',
      onConfirm: async () => { await onConfirm(); return true; }
    });
  }

  function showToast(message, type = 'info') {
    const colors = { success: '#2e7d32', error: '#e53935', info: '#1a237e', warning: '#f57c00' };
    const icons = { success: 'fa-check-circle', error: 'fa-times-circle', info: 'fa-info-circle', warning: 'fa-exclamation-triangle' };
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.style.cssText = `background:${colors[type]||colors.info};animation:slideRight 0.3s ease both`;
    toast.innerHTML = `<i class="fas ${icons[type]||icons.info}"></i> ${message}`;
    // Always attach to body so it survives page transitions
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'slideRightOut 0.3s ease forwards';
      setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 350);
    }, 3000);
  }

  function handleImageUpload(input, targetId) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => { document.getElementById(targetId).value = e.target.result; showToast('Image loaded', 'success'); };
    reader.readAsDataURL(file);
  }

  // ── PWA Install ─────────────────────────────────────────────────────────────
  let _installPrompt = null;

  function _isIos() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent);
  }
  function _isInStandaloneMode() {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  }

  function initInstall() {
    // If already installed as standalone, hide everything
    if (_isInStandaloneMode()) {
      _hideInstallButtons();
      return;
    }

    // Chrome/Edge/Android — native prompt available
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      _installPrompt = e;
      // Only show install UI if user is logged in (not on login page)
      if (Auth.isLoggedIn()) {
        _showInstallButtons();
        setTimeout(() => {
          if (!sessionStorage.getItem('install_dismissed')) showInstallBanner();
        }, 2000);
      }
    });

    window.addEventListener('appinstalled', () => {
      _installPrompt = null;
      _hideInstallButtons();
      const banner = document.getElementById('install-banner');
      if (banner) banner.remove();
      showToast('App installed successfully!', 'success');
    });

    // iOS Safari
    if (_isIos() && Auth.isLoggedIn()) {
      _showInstallButtons();
      setTimeout(() => {
        if (!sessionStorage.getItem('install_dismissed')) showInstallBanner();
      }, 2000);
    }

    // Fallback: show button after 4s only if logged in
    setTimeout(() => {
      if (!_isInStandaloneMode() && Auth.isLoggedIn()) _showInstallButtons();
    }, 4000);
  }

  function _showInstallButtons() {
    document.querySelectorAll('.install-nav-btn, .install-menu-btn, .install-sidebar-btn').forEach(b => b.classList.remove('hidden'));
  }
  function _hideInstallButtons() {
    document.querySelectorAll('.install-nav-btn, .install-menu-btn, .install-sidebar-btn').forEach(b => b.classList.add('hidden'));
  }

  function showInstallBanner() {
    if (document.getElementById('install-banner')) return;
    const isIos = _isIos();
    const banner = document.createElement('div');
    banner.id = 'install-banner';
    banner.className = 'install-banner animate-slide-up';
    banner.innerHTML = `
      <div class="install-banner-icon"><i class="fas fa-university"></i></div>
      <div class="install-banner-text">
        <strong>Install Smart Campus Guide</strong>
        <span>${isIos ? 'Tap <b>Share</b> then <b>Add to Home Screen</b>' : 'Add to your device for quick offline access'}</span>
      </div>
      ${isIos ? '' : `<button class="install-banner-btn" onclick="UI.promptInstall()"><i class="fas fa-download"></i> Install</button>`}
      <button class="install-banner-close" onclick="UI.dismissInstallBanner()" title="Dismiss"><i class="fas fa-times"></i></button>`;
    document.body.appendChild(banner);
  }

  async function promptInstall() {
    if (_isIos()) {
      // Show iOS instructions modal
      UI.showModal({
        title: '<i class="fas fa-mobile-alt"></i> Install on iPhone / iPad',
        body: `
          <div style="text-align:center;padding:8px 0">
            <p style="margin-bottom:16px;color:#546E7A">Follow these steps to add the app to your home screen:</p>
            <div style="display:flex;flex-direction:column;gap:14px;text-align:left">
              <div style="display:flex;align-items:center;gap:12px;padding:12px;background:#F4F7FC;border-radius:10px">
                <span style="font-size:24px">1️⃣</span>
                <span>Tap the <b>Share</b> button <i class="fas fa-share-square" style="color:#0D47A1"></i> at the bottom of Safari</span>
              </div>
              <div style="display:flex;align-items:center;gap:12px;padding:12px;background:#F4F7FC;border-radius:10px">
                <span style="font-size:24px">2️⃣</span>
                <span>Scroll down and tap <b>"Add to Home Screen"</b></span>
              </div>
              <div style="display:flex;align-items:center;gap:12px;padding:12px;background:#F4F7FC;border-radius:10px">
                <span style="font-size:24px">3️⃣</span>
                <span>Tap <b>"Add"</b> in the top right corner</span>
              </div>
            </div>
          </div>`,
        confirmText: '<i class="fas fa-check"></i> Got it',
        cancelText: '',
        onConfirm: () => true
      });
      return;
    }
    if (!_installPrompt) {
      // Show manual instructions for unsupported browsers
      UI.showModal({
        title: '<i class="fas fa-download"></i> Install App',
        body: `
          <div style="text-align:center;padding:8px 0">
            <p style="margin-bottom:16px;color:#546E7A">To install this app on your device:</p>
            <div style="display:flex;flex-direction:column;gap:12px;text-align:left">
              <div style="padding:12px;background:#F4F7FC;border-radius:10px">
                <b><i class="fab fa-chrome" style="color:#0D47A1"></i> Chrome / Edge (PC or Android)</b><br>
                <span style="font-size:0.85rem;color:#546E7A">Click the install icon <i class="fas fa-download"></i> in the address bar, or open the browser menu → "Install app"</span>
              </div>
              <div style="padding:12px;background:#F4F7FC;border-radius:10px">
                <b><i class="fab fa-safari" style="color:#0D47A1"></i> Safari (iPhone / iPad)</b><br>
                <span style="font-size:0.85rem;color:#546E7A">Tap Share <i class="fas fa-share-square"></i> → "Add to Home Screen"</span>
              </div>
              <div style="padding:12px;background:#FFFDE7;border-radius:10px;border-left:3px solid #FFD600">
                <span style="font-size:0.85rem"><i class="fas fa-info-circle" style="color:#0D47A1"></i> Make sure you are using <b>Chrome, Edge, or Safari</b> for the best install experience.</span>
              </div>
            </div>
          </div>`,
        confirmText: '<i class="fas fa-check"></i> OK',
        cancelText: '',
        onConfirm: () => true
      });
      return;
    }
    _installPrompt.prompt();
    const { outcome } = await _installPrompt.userChoice;
    if (outcome === 'accepted') {
      _installPrompt = null;
      const banner = document.getElementById('install-banner');
      if (banner) banner.remove();
    }
  }

  function dismissInstallBanner() {
    sessionStorage.setItem('install_dismissed', '1');
    const banner = document.getElementById('install-banner');
    if (banner) { banner.style.animation = 'slideRightOut 0.3s ease forwards'; setTimeout(() => banner.remove(), 350); }
  }

  return { renderNav, renderBottomNav, toggleSidebar, toggleUserMenu, showModal, handleModalConfirm, closeModal, showConfirm, showToast, handleImageUpload, initInstall, showInstallBanner, promptInstall, dismissInstallBanner };
})();

window.UI = UI;

// ─── Dashboard ───────────────────────────────────────────────────────────────
async function renderDashboard() {
  const app = document.getElementById('app');
  const user = Auth.getCurrentUser();
  const buildings = await DB.dbGetAll(DB.STORES.buildings);
  const rooms = await DB.dbGetAll(DB.STORES.rooms);
  const bookings = await DB.dbGetAll(DB.STORES.bookings);
  const notifications = await DB.dbGetAll(DB.STORES.notifications);
  const now = new Date();
  const todayBookings = bookings.filter(b => {
    const s = new Date(b.startTime);
    return s.toDateString() === now.toDateString();
  });
  const ongoingBookings = bookings.filter(b => new Date(b.startTime) <= now && new Date(b.endTime) >= now);
  const unreadNotifs = notifications.filter(n =>
    (n.targetRole === 'all' || n.targetRole === user.role) &&
    (!n.read || !n.read.includes(user.id))
  );
  const greeting = getGreeting();
  const roleColor = { admin: '#C62828', student: '#0D47A1', visitor: '#546E7A' };
  const color = roleColor[user.role] || '#0D47A1';

  app.innerHTML = `
  ${UI.renderNav('dashboard')}
  <div class="page-content dashboard-content">
    <div class="dashboard-hero" style="background:linear-gradient(135deg,${color} 0%,${color}cc 100%)">
      <div class="hero-content">
        <div class="hero-text">
          <p class="hero-greeting">${greeting}</p>
          <h2 class="hero-name">${user.name}</h2>
          <span class="hero-role-badge">${user.role.charAt(0).toUpperCase() + user.role.slice(1)}</span>
        </div>
        <div class="hero-icon"><i class="fas fa-university"></i></div>
      </div>
      <div class="hero-weather">
        <i class="fas fa-map-marker-alt"></i> Kabale University, Uganda
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card animate-fade-in" onclick="Router.navigate('buildings')" style="--stat-color:#0D47A1">
        <div class="stat-icon"><i class="fas fa-building"></i></div>
        <div class="stat-info"><span class="stat-num">${buildings.length}</span><span class="stat-label">Buildings</span></div>
      </div>
      <div class="stat-card animate-fade-in" onclick="Router.navigate('buildings')" style="--stat-color:#FFD600">
        <div class="stat-icon"><i class="fas fa-door-open"></i></div>
        <div class="stat-info"><span class="stat-num">${rooms.length}</span><span class="stat-label">Rooms</span></div>
      </div>
      ${user.role !== 'visitor' ? `
      <div class="stat-card animate-fade-in" onclick="Router.navigate('bookings')" style="--stat-color:#00695C">
        <div class="stat-icon"><i class="fas fa-calendar-check"></i></div>
        <div class="stat-info"><span class="stat-num">${todayBookings.length}</span><span class="stat-label">Today's Bookings</span></div>
      </div>` : ''}
      <div class="stat-card animate-fade-in" onclick="Router.navigate('notifications')" style="--stat-color:#C62828">
        <div class="stat-icon"><i class="fas fa-bell"></i></div>
        <div class="stat-info"><span class="stat-num">${unreadNotifs.length}</span><span class="stat-label">Unread Alerts</span></div>
      </div>
    </div>

    ${ongoingBookings.length ? `
    <div class="ongoing-banner animate-slide-up">
      <div class="ongoing-pulse"></div>
      <div class="ongoing-info">
        <strong><i class="fas fa-play-circle"></i> Ongoing Now</strong>
        <p>${ongoingBookings[0].title}</p>
      </div>
      <button class="btn-sm btn-white" onclick="Router.navigate('bookings')">View</button>
    </div>` : ''}

    <div class="quick-actions">
      <h3><i class="fas fa-bolt"></i> Quick Actions</h3>
      <div class="quick-grid">
        <button class="quick-btn" onclick="Router.navigate('map')">
          <div class="quick-icon" style="background:#0D47A120;color:#0D47A1"><i class="fas fa-map-marked-alt"></i></div>
          <span>Campus Map</span>
        </button>
        <button class="quick-btn" onclick="Router.navigate('buildings')">
          <div class="quick-icon" style="background:#FFD60030;color:#B8A020"><i class="fas fa-building"></i></div>
          <span>Buildings</span>
        </button>
        <button class="quick-btn" onclick="Router.navigate('search')">
          <div class="quick-icon" style="background:#00695C20;color:#00695C"><i class="fas fa-search"></i></div>
          <span>Search</span>
        </button>
        ${user.role !== 'visitor' ? `
        <button class="quick-btn" onclick="Router.navigate('bookings')">
          <div class="quick-icon" style="background:#0D47A120;color:#0D47A1"><i class="fas fa-calendar-plus"></i></div>
          <span>Book Room</span>
        </button>
        <button class="quick-btn" onclick="Router.navigate('timetable')">
          <div class="quick-icon" style="background:#00695C20;color:#00695C"><i class="fas fa-calendar-week"></i></div>
          <span>Timetable</span>
        </button>` : ''}
        ${Auth.isAdmin() ? `
        <button class="quick-btn" onclick="Router.navigate('admin')">
          <div class="quick-icon" style="background:#C6282820;color:#C62828"><i class="fas fa-cog"></i></div>
          <span>Admin</span>
        </button>` : ''}
      </div>
    </div>

    <div class="recent-buildings">
      <div class="section-header">
        <h3><i class="fas fa-building"></i> Campus Buildings</h3>
        <button class="btn-link" onclick="Router.navigate('buildings')">View all <i class="fas fa-arrow-right"></i></button>
      </div>
      <div class="buildings-scroll">
        ${buildings.slice(0, 6).map(b => renderMiniCard(b)).join('')}
      </div>
    </div>

    ${unreadNotifs.length ? `
    <div class="recent-notifs">
      <div class="section-header">
        <h3><i class="fas fa-bell"></i> Recent Notifications</h3>
        <button class="btn-link" onclick="Router.navigate('notifications')">View all <i class="fas fa-arrow-right"></i></button>
      </div>
      ${unreadNotifs.slice(0, 3).map(n => `
      <div class="mini-notif animate-fade-in" onclick="Router.navigate('notifications')">
        <i class="fas fa-circle" style="color:#e53935;font-size:8px"></i>
        <div><strong>${n.title}</strong><p>${n.message.substring(0, 60)}...</p></div>
      </div>`).join('')}
    </div>` : ''}
  </div>
  ${UI.renderBottomNav('dashboard')}`;

  Notifications.updateNotifBadge();
}

function renderMiniCard(b) {
  const colors = { Administration: '#0D47A1', Academic: '#1565C0', Library: '#082d6b', 'Student Services': '#FFD600', default: '#0D47A1' };
  const icons = { Administration: 'fa-landmark', Academic: 'fa-graduation-cap', Library: 'fa-book', 'Student Services': 'fa-users', default: 'fa-building' };
  const color = colors[b.category] || colors.default;
  const icon = icons[b.category] || icons.default;
  return `
  <div class="mini-card animate-fade-in" onclick="Router.navigate('building-detail',{id:${b.id}})">
    <div class="mini-card-icon" style="background:${color}">
      <i class="fas ${icon}"></i>
    </div>
    <span>${b.name}</span>
  </div>`;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning,';
  if (h < 17) return 'Good Afternoon,';
  return 'Good Evening,';
}

// ─── Map Page ─────────────────────────────────────────────────────────────────
async function renderMapPage() {
  const app = document.getElementById('app');
  // If map container already exists, just re-init the map (avoid full DOM wipe)
  if (document.getElementById('campus-map')) {
    MapModule.initMap('campus-map');
    return;
  }
  const buildings = await DB.dbGetAll(DB.STORES.buildings);
  app.innerHTML = `
  ${UI.renderNav('map')}
  <div class="map-page">
    <div class="map-controls">
      <div class="map-search-bar">
        <i class="fas fa-search"></i>
        <input type="text" id="map-search-input" placeholder="Search buildings or rooms..." oninput="searchOnMap(this.value)"/>
        <button class="map-search-clear hidden" id="map-search-clear" onclick="clearMapSearch()"><i class="fas fa-times"></i></button>
      </div>
      <div class="map-action-btns">
        <button class="map-btn" onclick="showAllOnMap()" title="Show All Buildings">
          <i class="fas fa-layer-group"></i><span>All</span>
        </button>
        <button class="map-btn" onclick="MapModule.clearMarkers();MapModule.resetView()" title="Clear Map">
          <i class="fas fa-eraser"></i><span>Clear</span>
        </button>
        <button class="map-btn" onclick="MapModule.clearRoute()" title="Clear Route">
          <i class="fas fa-route"></i><span>Route</span>
        </button>
        <button class="map-btn" onclick="MapModule.locateUser()" title="My Location">
          <i class="fas fa-crosshairs"></i><span>Me</span>
        </button>
      </div>
    </div>
    <div id="map-search-results" class="map-search-results hidden"></div>
    <div id="campus-map" class="campus-map"></div>
    <div class="map-buildings-panel" id="map-buildings-panel">
      <div class="panel-handle" onclick="toggleMapPanel()"></div>
      <div class="panel-title"><i class="fas fa-building"></i> Buildings (${buildings.length})</div>
      <div class="panel-buildings-list">
        ${buildings.map(b => `
        <div class="panel-building-item" onclick="pinBuilding(${b.id},${b.lat},${b.lng})">
          <div class="panel-item-icon"><i class="fas fa-map-marker-alt"></i></div>
          <div class="panel-item-info">
            <strong>${b.name}</strong>
            <span>${b.category || 'Building'}</span>
          </div>
          <button class="panel-dir-btn" onclick="event.stopPropagation();MapModule.getDirections(${b.lat},${b.lng})" title="Directions">
            <i class="fas fa-directions"></i>
          </button>
        </div>`).join('')}
      </div>
    </div>
  </div>
  ${UI.renderBottomNav('map')}`;

  setTimeout(() => {
    MapModule.initMap('campus-map');
  }, 100);
}

async function showAllOnMap() {
  const buildings = await DB.dbGetAll(DB.STORES.buildings);
  MapModule.showAllMarkers(buildings);
  UI.showToast(`Showing ${buildings.length} buildings`, 'info');
}

function pinBuilding(id, lat, lng) {
  DB.dbGet(DB.STORES.buildings, id).then(b => {
    if (b) MapModule.addBuildingMarker(b);
    MapModule.focusMarker(id);
  });
}

function toggleMapPanel() {
  const panel = document.getElementById('map-buildings-panel');
  if (panel) panel.classList.toggle('expanded');
}

async function searchOnMap(query) {
  const resultsEl = document.getElementById('map-search-results');
  const clearBtn = document.getElementById('map-search-clear');
  if (!query.trim()) {
    resultsEl.classList.add('hidden');
    clearBtn.classList.add('hidden');
    return;
  }
  clearBtn.classList.remove('hidden');
  const q = query.toLowerCase();
  const buildings = await DB.dbGetAll(DB.STORES.buildings);
  const rooms = await DB.dbGetAll(DB.STORES.rooms);
  const matchBuildings = buildings.filter(b => b.name.toLowerCase().includes(q));
  const matchRooms = rooms.filter(r => r.name.toLowerCase().includes(q));
  if (!matchBuildings.length && !matchRooms.length) {
    resultsEl.innerHTML = '<div class="no-results"><i class="fas fa-search"></i> No results found</div>';
    resultsEl.classList.remove('hidden');
    return;
  }
  const buildingMap = {};
  buildings.forEach(b => buildingMap[b.id] = b);
  resultsEl.innerHTML = `
    ${matchBuildings.map(b => `
    <div class="search-result-item" onclick="selectSearchResult('building',${b.id},${b.lat},${b.lng})">
      <i class="fas fa-building"></i>
      <div><strong>${b.name}</strong><span>${b.category || 'Building'}</span></div>
    </div>`).join('')}
    ${matchRooms.map(r => `
    <div class="search-result-item" onclick="selectSearchResult('room',${r.id},${r.lat},${r.lng},'${r.name.replace(/'/g,"\\'")}','${(buildingMap[r.buildingId]||{name:''}).name.replace(/'/g,"\\'")}')">
      <i class="fas fa-door-open"></i>
      <div><strong>${r.name}</strong><span>${buildingMap[r.buildingId] ? buildingMap[r.buildingId].name : ''} • Floor ${r.floor}</span></div>
    </div>`).join('')}`;
  resultsEl.classList.remove('hidden');
}

function selectSearchResult(type, id, lat, lng, name, buildingName) {
  document.getElementById('map-search-results').classList.add('hidden');
  if (type === 'building') {
    DB.dbGet(DB.STORES.buildings, id).then(b => {
      if (b) MapModule.addBuildingMarker(b);
      MapModule.focusMarker(id);
    });
  } else {
    MapModule.addRoomMarker({ id, lat, lng, name, floor: 1 }, buildingName || '');
    MapModule.focusMarker('room_' + id);
  }
}

function clearMapSearch() {
  document.getElementById('map-search-input').value = '';
  document.getElementById('map-search-results').classList.add('hidden');
  document.getElementById('map-search-clear').classList.add('hidden');
}

// ─── Search Page ──────────────────────────────────────────────────────────────
async function renderSearchPage() {
  const app = document.getElementById('app');
  app.innerHTML = `
  ${UI.renderNav('search')}
  <div class="page-content">
    <div class="page-header">
      <h2><i class="fas fa-search"></i> Search Campus</h2>
    </div>
    <div class="search-bar-wrap">
      <div class="search-bar search-bar-lg">
        <i class="fas fa-search"></i>
        <input type="text" id="global-search" placeholder="Search buildings, rooms..." autofocus oninput="globalSearch(this.value)"/>
      </div>
    </div>
    <div id="search-results" class="search-results-page">
      <div class="search-hint">
        <i class="fas fa-map-marked-alt"></i>
        <p>Search for any building or room on campus</p>
      </div>
    </div>
  </div>
  ${UI.renderBottomNav('search')}`;
}

async function globalSearch(query) {
  const resultsEl = document.getElementById('search-results');
  if (!query.trim()) {
    resultsEl.innerHTML = '<div class="search-hint"><i class="fas fa-map-marked-alt"></i><p>Search for any building or room on campus</p></div>';
    return;
  }
  const q = query.toLowerCase();
  const buildings = await DB.dbGetAll(DB.STORES.buildings);
  const rooms = await DB.dbGetAll(DB.STORES.rooms);
  const buildingMap = {};
  buildings.forEach(b => buildingMap[b.id] = b);
  const matchB = buildings.filter(b => b.name.toLowerCase().includes(q) || (b.description || '').toLowerCase().includes(q) || (b.category || '').toLowerCase().includes(q));
  const matchR = rooms.filter(r => r.name.toLowerCase().includes(q) || (r.description || '').toLowerCase().includes(q));
  if (!matchB.length && !matchR.length) {
    resultsEl.innerHTML = '<div class="empty-state"><i class="fas fa-search"></i><p>No results for "' + query + '"</p></div>';
    return;
  }
  const colors = { Administration: '#0D47A1', Academic: '#1565C0', Library: '#082d6b', 'Student Services': '#FFD600', default: '#0D47A1' };
  resultsEl.innerHTML = `
    ${matchB.length ? `<div class="results-section"><h4><i class="fas fa-building"></i> Buildings (${matchB.length})</h4>
    ${matchB.map(b => `
    <div class="search-result-card animate-fade-in" onclick="Router.navigate('building-detail',{id:${b.id}})">
      <div class="src-icon" style="background:${colors[b.category]||colors.default}"><i class="fas fa-building"></i></div>
      <div class="src-body">
        <strong>${b.name}</strong>
        <span>${b.category || 'Building'} • ${b.floors || 1} floor(s)</span>
        <p>${(b.description||'').substring(0,60)}...</p>
      </div>
      <div class="src-actions">
        <button onclick="event.stopPropagation();Router.navigate('map');setTimeout(()=>{DB.dbGet(DB.STORES.buildings,${b.id}).then(bld=>{MapModule.addBuildingMarker(bld);MapModule.focusMarker(${b.id})})},600)" title="View on Map"><i class="fas fa-map-marker-alt"></i></button>
        <button onclick="event.stopPropagation();MapModule.getDirections(${b.lat},${b.lng});Router.navigate('map')" title="Directions"><i class="fas fa-directions"></i></button>
      </div>
    </div>`).join('')}</div>` : ''}
    ${matchR.length ? `<div class="results-section"><h4><i class="fas fa-door-open"></i> Rooms (${matchR.length})</h4>
    ${matchR.map(r => `
    <div class="search-result-card animate-fade-in" onclick="Router.navigate('building-detail',{id:${r.buildingId}})">
      <div class="src-icon" style="background:#00838f"><i class="fas fa-door-open"></i></div>
      <div class="src-body">
        <strong>${r.name}</strong>
        <span>${buildingMap[r.buildingId] ? buildingMap[r.buildingId].name : ''} • Floor ${r.floor}</span>
        ${r.capacity ? `<p><i class="fas fa-users"></i> Capacity: ${r.capacity}</p>` : ''}
      </div>
      <div class="src-actions">
        <button onclick="event.stopPropagation();MapModule.addRoomMarker({id:${r.id},lat:${r.lat},lng:${r.lng},name:'${r.name.replace(/'/g,"\\'")}',floor:${r.floor}},'${(buildingMap[r.buildingId]||{name:''}).name.replace(/'/g,"\\'")}');MapModule.focusMarker('room_${r.id}');Router.navigate('map')" title="View on Map"><i class="fas fa-map-marker-alt"></i></button>
        <button onclick="event.stopPropagation();MapModule.getDirections(${r.lat},${r.lng});Router.navigate('map')" title="Directions"><i class="fas fa-directions"></i></button>
      </div>
    </div>`).join('')}</div>` : ''}`;
}

// ─── Admin Panel ──────────────────────────────────────────────────────────────
async function renderAdminPage() {
  const app = document.getElementById('app');
  if (!Auth.isAdmin()) { UI.showToast('Access denied', 'error'); Router.navigate('dashboard'); return; }
  const users = await DB.dbGetAll(DB.STORES.users);
  const buildings = await DB.dbGetAll(DB.STORES.buildings);
  const rooms = await DB.dbGetAll(DB.STORES.rooms);
  const bookings = await DB.dbGetAll(DB.STORES.bookings);

  app.innerHTML = `
  ${UI.renderNav('admin')}
  <div class="page-content">
    <div class="page-header">
      <h2><i class="fas fa-cog"></i> Admin Panel</h2>
    </div>
    <div class="admin-stats">
      <div class="admin-stat" style="--c:#0D47A1"><i class="fas fa-users"></i><span>${users.length}</span><p>Users</p></div>
      <div class="admin-stat" style="--c:#FFD600"><i class="fas fa-building"></i><span>${buildings.length}</span><p>Buildings</p></div>
      <div class="admin-stat" style="--c:#00695C"><i class="fas fa-door-open"></i><span>${rooms.length}</span><p>Rooms</p></div>
      <div class="admin-stat" style="--c:#C62828"><i class="fas fa-calendar-check"></i><span>${bookings.length}</span><p>Bookings</p></div>
    </div>
    <div class="admin-tabs">
      <button class="admin-tab active" onclick="switchAdminTab('users',this)"><i class="fas fa-users"></i> Users</button>
      <button class="admin-tab" onclick="switchAdminTab('buildings-admin',this)"><i class="fas fa-building"></i> Buildings</button>
      <button class="admin-tab" onclick="switchAdminTab('bookings-admin',this)"><i class="fas fa-calendar-alt"></i> Bookings</button>
    </div>
    <div id="admin-tab-content">
      ${renderUsersTab(users)}
    </div>
  </div>
  ${UI.renderBottomNav('admin')}`;
}

function renderUsersTab(users) {
  return `
  <div class="admin-section">
    <div class="section-header">
      <h3><i class="fas fa-users"></i> Manage Users</h3>
      <button class="btn-primary btn-sm" onclick="showAddUser()"><i class="fas fa-user-plus"></i> Add User</button>
    </div>
    <div class="users-list">
      ${users.map(u => `
      <div class="user-card animate-fade-in">
        <div class="user-avatar" style="background:${u.role==='admin'?'#e53935':u.role==='student'?'#1a237e':'#2e7d32'}">
          ${u.name.charAt(0).toUpperCase()}
        </div>
        <div class="user-info">
          <strong>${u.name}</strong>
          <span>${u.username} • ${u.email || ''}</span>
          <div class="user-badges">
            <span class="role-badge role-${u.role}">${u.role}</span>
            ${u.permissions && u.permissions.includes('admin') ? '<span class="perm-badge">Admin Perms</span>' : ''}
          </div>
        </div>
        <div class="user-actions">
          <button class="btn-icon btn-edit" onclick="showEditUser(${u.id})"><i class="fas fa-edit"></i></button>
          ${u.role !== 'admin' ? `<button class="btn-icon" onclick="toggleAdminPermission(${u.id})" title="Toggle Admin Permission">
            <i class="fas fa-shield-alt"></i></button>` : ''}
          <button class="btn-icon btn-danger" onclick="deleteUser(${u.id})"><i class="fas fa-trash"></i></button>
        </div>
      </div>`).join('')}
    </div>
  </div>`;
}

async function switchAdminTab(tab, btn) {
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  const content = document.getElementById('admin-tab-content');
  if (tab === 'users') {
    const users = await DB.dbGetAll(DB.STORES.users);
    content.innerHTML = renderUsersTab(users);
  } else if (tab === 'buildings-admin') {
    const buildings = await DB.dbGetAll(DB.STORES.buildings);
    const rooms = await DB.dbGetAll(DB.STORES.rooms);
    content.innerHTML = `
    <div class="admin-section">
      <div class="section-header">
        <h3><i class="fas fa-building"></i> Buildings & Rooms</h3>
        <button class="btn-primary btn-sm" onclick="Buildings.showAddBuilding()"><i class="fas fa-plus"></i> Add Building</button>
      </div>
      <div class="admin-buildings-list">
        ${buildings.map(b => {
          const bRooms = rooms.filter(r => r.buildingId === b.id);
          return `<div class="admin-building-row">
            <div class="abr-info"><strong>${b.name}</strong><span>${b.category} • ${bRooms.length} rooms</span></div>
            <div class="abr-actions">
              <button class="btn-icon" onclick="Router.navigate('building-detail',{id:${b.id}})"><i class="fas fa-eye"></i></button>
              <button class="btn-icon btn-edit" onclick="Buildings.showEditBuilding(${b.id})"><i class="fas fa-edit"></i></button>
              <button class="btn-icon btn-danger" onclick="Buildings.deleteBuilding(${b.id})"><i class="fas fa-trash"></i></button>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  } else if (tab === 'bookings-admin') {
    const bookings = await DB.dbGetAll(DB.STORES.bookings);
    const rooms = await DB.dbGetAll(DB.STORES.rooms);
    const roomMap = {};
    rooms.forEach(r => roomMap[r.id] = r);
    content.innerHTML = `
    <div class="admin-section">
      <div class="section-header"><h3><i class="fas fa-calendar-alt"></i> All Bookings</h3></div>
      <div class="admin-bookings-list">
        ${bookings.length ? bookings.sort((a,b)=>new Date(b.startTime)-new Date(a.startTime)).map(b => `
        <div class="admin-booking-row">
          <div class="abk-info">
            <strong>${b.title}</strong>
            <span>${roomMap[b.roomId] ? roomMap[b.roomId].name : 'Unknown'} • ${b.bookedBy}</span>
            <span>${formatDateTime(b.startTime)}</span>
          </div>
          <button class="btn-icon btn-danger" onclick="Booking.deleteBooking(${b.id})"><i class="fas fa-trash"></i></button>
        </div>`).join('') : '<div class="empty-state"><i class="fas fa-calendar-times"></i><p>No bookings</p></div>'}
      </div>
    </div>`;
  }
}

function showAddUser() {
  UI.showModal({
    title: '<i class="fas fa-user-plus"></i> Add User',
    body: userForm(),
    onConfirm: saveUser
  });
}

async function showEditUser(id) {
  const u = await DB.dbGet(DB.STORES.users, id);
  UI.showModal({
    title: '<i class="fas fa-edit"></i> Edit User',
    body: userForm(u),
    onConfirm: () => saveUser(id)
  });
}

function userForm(u = {}) {
  return `
  <div class="form-grid">
    <div class="form-group"><label>Full Name *</label><input type="text" id="u-name" class="form-input" value="${u.name||''}"/></div>
    <div class="form-group"><label>Username *</label><input type="text" id="u-username" class="form-input" value="${u.username||''}"/></div>
    <div class="form-group"><label>Email</label><input type="email" id="u-email" class="form-input" value="${u.email||''}"/></div>
    <div class="form-group"><label>Password ${u.id ? '(leave blank to keep)' : '*'}</label><input type="password" id="u-password" class="form-input"/></div>
    <div class="form-group"><label>Role</label>
      <select id="u-role" class="form-input">
        <option value="student" ${u.role==='student'?'selected':''}>Student</option>
        <option value="admin" ${u.role==='admin'?'selected':''}>Admin</option>
        <option value="visitor" ${u.role==='visitor'?'selected':''}>Visitor</option>
      </select>
    </div>
  </div>`;
}

async function saveUser(existingId = null) {
  const name = document.getElementById('u-name').value.trim();
  const username = document.getElementById('u-username').value.trim();
  const password = document.getElementById('u-password').value;
  if (!name || !username) { UI.showToast('Name and username required', 'error'); return false; }
  if (!existingId && !password) { UI.showToast('Password required for new user', 'error'); return false; }
  const data = { name, username, email: document.getElementById('u-email').value.trim(), role: document.getElementById('u-role').value, permissions: [], createdAt: new Date().toISOString() };
  if (password) data.password = password;
  if (existingId) { data.id = existingId; await DB.dbPut(DB.STORES.users, data); Sync.afterWrite(DB.STORES.users, data); UI.showToast('User updated!', 'success'); }
  else { const newId = await DB.dbAdd(DB.STORES.users, data); data.id = newId; Sync.afterWrite(DB.STORES.users, data); UI.showToast('User added!', 'success'); }
  renderAdminPage();
  return true;
}

async function toggleAdminPermission(userId) {
  const u = await DB.dbGet(DB.STORES.users, userId);
  if (!u) return;
  if (!u.permissions) u.permissions = [];
  if (u.permissions.includes('admin')) {
    u.permissions = u.permissions.filter(p => p !== 'admin');
    UI.showToast('Admin permission removed', 'info');
  } else {
    u.permissions.push('admin');
    UI.showToast('Admin permission granted', 'success');
  }
  await DB.dbPut(DB.STORES.users, u);
  Sync.afterWrite(DB.STORES.users, u);
  renderAdminPage();
}

async function deleteUser(id) {
  const current = Auth.getCurrentUser();
  if (current.id === id) { UI.showToast('Cannot delete your own account', 'error'); return; }
  UI.showConfirm('Delete this user?', async () => {
    await DB.dbDelete(DB.STORES.users, id);
    Sync.afterDelete(DB.STORES.users, id);
    UI.showToast('User deleted', 'info');
    renderAdminPage();
  });
}

// ─── Profile Page ─────────────────────────────────────────────────────────────
async function renderProfilePage() {
  const app = document.getElementById('app');
  const user = Auth.getCurrentUser();
  const fullUser = user.id ? await DB.dbGet(DB.STORES.users, user.id) : user;
  const roleColor = { admin: '#C62828', student: '#0D47A1', visitor: '#546E7A' };
  const color = roleColor[user.role] || '#0D47A1';

  app.innerHTML = `
  ${UI.renderNav('profile')}
  <div class="page-content">
    <div class="profile-hero" style="background:linear-gradient(135deg,${color},${color}99)">
      <div class="profile-avatar-wrap">
        <div class="profile-avatar" style="background:white;color:${color}">
          ${user.name.charAt(0).toUpperCase()}
        </div>
      </div>
      <h2>${user.name}</h2>
      <span class="role-badge role-${user.role}">${user.role}</span>
    </div>
    <div class="profile-body">
      <div class="profile-card">
        <div class="profile-row"><i class="fas fa-user" style="color:${color}"></i><div><label>Full Name</label><p>${user.name}</p></div></div>
        <div class="profile-row"><i class="fas fa-at" style="color:${color}"></i><div><label>Username</label><p>${user.username}</p></div></div>
        ${fullUser && fullUser.email ? `<div class="profile-row"><i class="fas fa-envelope" style="color:${color}"></i><div><label>Email</label><p>${fullUser.email}</p></div></div>` : ''}
        <div class="profile-row"><i class="fas fa-shield-alt" style="color:${color}"></i><div><label>Role</label><p>${user.role}</p></div></div>
        ${fullUser && fullUser.permissions && fullUser.permissions.includes('admin') ? `<div class="profile-row"><i class="fas fa-star" style="color:#f57c00"></i><div><label>Permissions</label><p>Admin Access Granted</p></div></div>` : ''}
      </div>
      ${user.role !== 'visitor' ? `
      <button class="btn-primary btn-full" onclick="showChangePassword()">
        <i class="fas fa-key"></i> Change Password
      </button>` : ''}
      <button class="btn-danger btn-full" onclick="Auth.logout()">
        <i class="fas fa-sign-out-alt"></i> Logout
      </button>
    </div>
  </div>
  ${UI.renderBottomNav('profile')}`;
}

function showChangePassword() {
  UI.showModal({
    title: '<i class="fas fa-key"></i> Change Password',
    body: `
    <div class="form-grid">
      <div class="form-group full-width"><label>Current Password</label><input type="password" id="cp-current" class="form-input"/></div>
      <div class="form-group full-width"><label>New Password</label><input type="password" id="cp-new" class="form-input"/></div>
      <div class="form-group full-width"><label>Confirm New Password</label><input type="password" id="cp-confirm" class="form-input"/></div>
    </div>`,
    onConfirm: changePassword
  });
}

async function changePassword() {
  const current = document.getElementById('cp-current').value;
  const newPwd = document.getElementById('cp-new').value;
  const confirm = document.getElementById('cp-confirm').value;
  if (!current || !newPwd || !confirm) { UI.showToast('All fields required', 'error'); return false; }
  if (newPwd !== confirm) { UI.showToast('Passwords do not match', 'error'); return false; }
  if (newPwd.length < 6) { UI.showToast('Password must be at least 6 characters', 'error'); return false; }
  const user = Auth.getCurrentUser();
  const dbUser = await DB.dbGet(DB.STORES.users, user.id);
  if (!dbUser || dbUser.password !== current) { UI.showToast('Current password is incorrect', 'error'); return false; }
  dbUser.password = newPwd;
  await DB.dbPut(DB.STORES.users, dbUser);
  UI.showToast('Password changed successfully!', 'success');
  return true;
}

// ─── Router Setup & Init ──────────────────────────────────────────────────────
function initApp() {
  Router.register('login', () => {
    document.getElementById('app').innerHTML = Auth.renderLoginPage();
  });
  Router.register('dashboard', renderDashboard);
  Router.register('map', renderMapPage);
  Router.register('buildings', Buildings.renderBuildingsPage);
  Router.register('building-detail', Buildings.renderBuildingDetail);
  Router.register('bookings', Booking.renderBookingsPage);
  Router.register('timetable', Timetable.renderTimetablePage);
  Router.register('notifications', Notifications.renderNotificationsPage);
  Router.register('admin', renderAdminPage);
  Router.register('search', renderSearchPage);
  Router.register('profile', renderProfilePage);

  DB.seedDefaultData().then(() => {
    // Remove splash screen cleanly
    const splash = document.querySelector('.splash-screen');
    if (splash) {
      splash.style.transition = 'opacity 0.4s ease';
      splash.style.opacity = '0';
      setTimeout(() => { if (splash.parentNode) splash.parentNode.removeChild(splash); }, 450);
    }
    UI.initInstall();
    Router.init();
    if (Auth.isLoggedIn()) Notifications.updateNotifBadge();
    // Init sync after app is stable
    setTimeout(() => Sync.init(), 1500);
  }).catch(err => {
    console.error('App init error:', err);
    const splash = document.querySelector('.splash-screen');
    if (splash) splash.remove();
    UI.initInstall();
    Router.init();
  });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
}

document.addEventListener('DOMContentLoaded', initApp);
