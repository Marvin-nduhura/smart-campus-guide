// Notifications module
const Notifications = (() => {

  async function renderNotificationsPage() {
    const app = document.getElementById('app');
    const user = Auth.getCurrentUser();
    const all = await DB.dbGetAll(DB.STORES.notifications);
    const mine = all.filter(n =>
      n.targetRole === 'all' ||
      n.targetRole === user.role ||
      (n.targetRole === 'student' && user.role === 'student') ||
      (n.targetRole === 'admin' && user.role === 'admin') ||
      (n.targetRole === 'visitor' && user.role === 'visitor')
    ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const unread = mine.filter(n => !n.read || !n.read.includes(user.id));

    app.innerHTML = `
    ${UI.renderNav('notifications')}
    <div class="page-content">
      <div class="page-header">
        <div>
          <h2><i class="fas fa-bell"></i> Notifications</h2>
          <p class="subtitle">${unread.length} unread</p>
        </div>
        <div class="header-actions">
          ${unread.length ? `<button class="btn-secondary btn-sm" onclick="Notifications.markAllRead()"><i class="fas fa-check-double"></i> Mark all read</button>` : ''}
          ${Auth.isAdmin() ? `<button class="btn-primary" onclick="Notifications.showSendNotification()"><i class="fas fa-paper-plane"></i> Send</button>` : ''}
        </div>
      </div>
      <div class="notifications-list" id="notif-list">
        ${mine.length ? mine.map(n => renderNotifCard(n, user)).join('') :
          `<div class="empty-state"><i class="fas fa-bell-slash"></i><p>No notifications yet</p></div>`}
      </div>
    </div>
    ${UI.renderBottomNav('notifications')}`;
  }

  function renderNotifCard(n, user) {
    const isRead = n.read && n.read.includes(user.id);
    const typeColors = { info: '#1a237e', warning: '#f57c00', success: '#2e7d32', alert: '#e53935' };
    const typeIcons = { info: 'fa-info-circle', warning: 'fa-exclamation-triangle', success: 'fa-check-circle', alert: 'fa-bell' };
    const color = typeColors[n.type] || typeColors.info;
    const icon = typeIcons[n.type] || typeIcons.info;
    const timeAgo = getTimeAgo(n.createdAt);
    return `
    <div class="notif-card animate-fade-in ${isRead ? 'notif-read' : 'notif-unread'}" onclick="Notifications.markRead(${n.id})">
      <div class="notif-icon" style="background:${color}20;color:${color}">
        <i class="fas ${icon}"></i>
      </div>
      <div class="notif-body">
        <div class="notif-header-row">
          <h4>${n.title}</h4>
          ${!isRead ? '<span class="unread-dot"></span>' : ''}
        </div>
        <p>${n.message}</p>
        <div class="notif-meta">
          <span><i class="fas fa-user"></i> ${n.senderName || 'System'}</span>
          <span><i class="fas fa-clock"></i> ${timeAgo}</span>
          <span class="notif-target-badge">${formatTarget(n.targetRole)}</span>
        </div>
      </div>
      ${Auth.isAdmin() ? `
      <button class="notif-delete-btn" onclick="event.stopPropagation();Notifications.deleteNotif(${n.id})">
        <i class="fas fa-times"></i>
      </button>` : ''}
    </div>`;
  }

  function formatTarget(role) {
    const map = { all: 'Everyone', student: 'Students', admin: 'Admins', visitor: 'Visitors' };
    return map[role] || role;
  }

  async function markRead(id) {
    const user = Auth.getCurrentUser();
    const n = await DB.dbGet(DB.STORES.notifications, id);
    if (!n) return;
    if (!n.read) n.read = [];
    if (!n.read.includes(user.id)) {
      n.read.push(user.id);
      await DB.dbPut(DB.STORES.notifications, n);
      const card = document.querySelector(`.notif-card[onclick*="${id}"]`);
      if (card) { card.classList.remove('notif-unread'); card.classList.add('notif-read'); }
      updateNotifBadge();
    }
  }

  async function markAllRead() {
    const user = Auth.getCurrentUser();
    const all = await DB.dbGetAll(DB.STORES.notifications);
    for (const n of all) {
      if (!n.read) n.read = [];
      if (!n.read.includes(user.id)) { n.read.push(user.id); await DB.dbPut(DB.STORES.notifications, n); }
    }
    UI.showToast('All notifications marked as read', 'success');
    renderNotificationsPage();
    updateNotifBadge();
  }

  async function deleteNotif(id) {
    await DB.dbDelete(DB.STORES.notifications, id);
    UI.showToast('Notification deleted', 'info');
    renderNotificationsPage();
  }

  function showSendNotification() {
    UI.showModal({
      title: '<i class="fas fa-paper-plane"></i> Send Notification',
      body: `
      <div class="form-grid">
        <div class="form-group full-width">
          <label><i class="fas fa-heading"></i> Title *</label>
          <input type="text" id="n-title" class="form-input" placeholder="Notification title..."/>
        </div>
        <div class="form-group full-width">
          <label><i class="fas fa-align-left"></i> Message *</label>
          <textarea id="n-message" class="form-input" rows="4" placeholder="Write your message..."></textarea>
        </div>
        <div class="form-group">
          <label><i class="fas fa-users"></i> Send To</label>
          <select id="n-target" class="form-input">
            <option value="all">Everyone</option>
            <option value="student">Students Only</option>
            <option value="admin">Admins Only</option>
            <option value="visitor">Visitors Only</option>
          </select>
        </div>
        <div class="form-group">
          <label><i class="fas fa-tag"></i> Type</label>
          <select id="n-type" class="form-input">
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="success">Success</option>
            <option value="alert">Alert</option>
          </select>
        </div>
      </div>`,
      onConfirm: sendNotification
    });
  }

  async function sendNotification() {
    const title = document.getElementById('n-title').value.trim();
    const message = document.getElementById('n-message').value.trim();
    if (!title || !message) { UI.showToast('Title and message are required', 'error'); return false; }
    const user = Auth.getCurrentUser();
    await DB.dbAdd(DB.STORES.notifications, {
      title, message,
      targetRole: document.getElementById('n-target').value,
      type: document.getElementById('n-type').value,
      senderId: user.id,
      senderName: user.name,
      createdAt: new Date().toISOString(),
      read: []
    });
    UI.showToast('Notification sent!', 'success');
    setTimeout(() => renderNotificationsPage(), 350);
    return true;
  }

  async function updateNotifBadge() {
    const user = Auth.getCurrentUser();
    if (!user) return;
    try {
      const all = await DB.dbGetAll(DB.STORES.notifications);
      const unread = all.filter(n =>
        (n.targetRole === 'all' || n.targetRole === user.role) &&
        (!n.read || !n.read.includes(user.id))
      ).length;
      document.querySelectorAll('.notif-badge').forEach(b => {
        b.textContent = unread > 9 ? '9+' : (unread > 0 ? String(unread) : '');
        b.style.display = unread > 0 ? 'flex' : 'none';
      });
    } catch (_) {}
  }

  function getTimeAgo(iso) {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  return { renderNotificationsPage, markRead, markAllRead, deleteNotif, showSendNotification, sendNotification, updateNotifBadge };
})();

window.Notifications = Notifications;
