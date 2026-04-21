// Room Booking module
const Booking = (() => {

  async function renderBookingsPage() {
    const app = document.getElementById('app');
    const user = Auth.getCurrentUser();
    const allBookings = await DB.serverGetAll(DB.STORES.bookings);
    const myBookings = user.role === 'admin' ? allBookings : allBookings.filter(b => b.userId === user.id);
    const rooms = await DB.serverGetAll(DB.STORES.rooms);
    const buildings = await DB.serverGetAll(DB.STORES.buildings);
    const roomMap = {};
    rooms.forEach(r => roomMap[r.id] = r);
    const buildingMap = {};
    buildings.forEach(b => buildingMap[b.id] = b);

    app.innerHTML = `
    ${UI.renderNav('bookings')}
    <div class="page-content">
      <div class="page-header">
        <div>
          <h2><i class="fas fa-calendar-alt"></i> Room Bookings</h2>
          <p class="subtitle">${myBookings.length} booking${myBookings.length !== 1 ? 's' : ''}</p>
        </div>
        <button class="btn-primary" onclick="Booking.showNewBooking()"><i class="fas fa-plus"></i> New Booking</button>
      </div>
      <div class="booking-tabs">
        <button class="booking-tab active" onclick="Booking.filterBookings('upcoming',this)"><i class="fas fa-clock"></i> Upcoming</button>
        <button class="booking-tab" onclick="Booking.filterBookings('ongoing',this)"><i class="fas fa-play-circle"></i> Ongoing</button>
        <button class="booking-tab" onclick="Booking.filterBookings('past',this)"><i class="fas fa-history"></i> Past</button>
        ${user.role === 'admin' ? `<button class="booking-tab" onclick="Booking.filterBookings('all',this)"><i class="fas fa-list"></i> All</button>` : ''}
      </div>
      <div class="bookings-list" id="bookings-list">
        ${myBookings.length ? myBookings.map(b => renderBookingCard(b, roomMap, buildingMap, user)).join('') : `
        <div class="empty-state">
          <i class="fas fa-calendar-times"></i>
          <p>No bookings yet</p>
          <button class="btn-primary" onclick="Booking.showNewBooking()"><i class="fas fa-plus"></i> Make a Booking</button>
        </div>`}
      </div>
    </div>
    ${UI.renderBottomNav('bookings')}`;
    filterBookings('upcoming', document.querySelector('.booking-tab'));
  }

  function renderBookingCard(b, roomMap, buildingMap, user) {
    const room = roomMap[b.roomId];
    const building = room ? buildingMap[room.buildingId] : null;
    const now = new Date();
    const start = new Date(b.startTime);
    const end = new Date(b.endTime);
    let status = 'upcoming', statusColor = '#1a237e', statusIcon = 'fa-clock';
    if (now >= start && now <= end) { status = 'ongoing'; statusColor = '#2e7d32'; statusIcon = 'fa-play-circle'; }
    else if (now > end) { status = 'past'; statusColor = '#757575'; statusIcon = 'fa-history'; }
    const canEdit = Auth.canEdit() || b.userId === user.id;
    return `
    <div class="booking-card animate-fade-in" data-status="${status}">
      <div class="booking-card-left" style="background:${statusColor}">
        <i class="fas ${statusIcon}"></i>
        <span>${status}</span>
      </div>
      <div class="booking-card-body">
        <h4>${b.title}</h4>
        <p class="booking-room"><i class="fas fa-door-open"></i> ${room ? room.name : 'Unknown Room'} ${building ? '• ' + building.name : ''}</p>
        <p class="booking-time"><i class="fas fa-clock"></i> ${formatDateTime(b.startTime)} – ${formatTime(b.endTime)}</p>
        <p class="booking-type"><i class="fas fa-tag"></i> ${b.type || 'Event'}</p>
        ${b.description ? `<p class="booking-desc">${b.description}</p>` : ''}
        ${b.bookedBy ? `<p class="booking-by"><i class="fas fa-user"></i> ${b.bookedBy}</p>` : ''}
      </div>
      ${canEdit ? `
      <div class="booking-card-actions">
        ${status !== 'past' ? `<button class="btn-icon btn-edit" onclick="Booking.showEditBooking(${b.id})"><i class="fas fa-edit"></i></button>` : ''}
        <button class="btn-icon btn-danger" onclick="Booking.deleteBooking(${b.id})"><i class="fas fa-trash"></i></button>
      </div>` : ''}
    </div>`;
  }

  function filterBookings(filter, btn) {
    if (btn) {
      document.querySelectorAll('.booking-tab').forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
    }
    const cards = document.querySelectorAll('.booking-card');
    const now = new Date();
    cards.forEach(card => {
      const status = card.dataset.status;
      let show = false;
      if (filter === 'all') show = true;
      else if (filter === 'upcoming') show = status === 'upcoming';
      else if (filter === 'ongoing') show = status === 'ongoing';
      else if (filter === 'past') show = status === 'past';
      card.style.display = show ? '' : 'none';
    });
  }

  async function showBookingModal(roomId, roomName) {
    const bookings = await DB.dbGetByIndex(DB.STORES.bookings, 'roomId', roomId);
    const now = new Date();
    const ongoing = bookings.filter(b => new Date(b.startTime) <= now && new Date(b.endTime) >= now);
    const upcoming = bookings.filter(b => new Date(b.startTime) > now).sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
    UI.showModal({
      title: `<i class="fas fa-calendar-plus"></i> Book: ${roomName}`,
      body: `
      ${ongoing.length ? `<div class="booking-alert ongoing-alert"><i class="fas fa-exclamation-circle"></i> <strong>Ongoing:</strong> ${ongoing[0].title} until ${formatTime(ongoing[0].endTime)}</div>` : ''}
      ${upcoming.length ? `<div class="booking-alert upcoming-alert"><i class="fas fa-info-circle"></i> <strong>Next booking:</strong> ${upcoming[0].title} at ${formatDateTime(upcoming[0].startTime)}</div>` : ''}
      <div class="form-grid">
        <div class="form-group full-width">
          <label><i class="fas fa-heading"></i> Event/Session Title *</label>
          <input type="text" id="bk-title" class="form-input" placeholder="e.g. CS101 Lecture"/>
        </div>
        <div class="form-group">
          <label><i class="fas fa-tag"></i> Type</label>
          <select id="bk-type" class="form-input">
            <option value="Class">Class</option>
            <option value="Event">Event</option>
            <option value="Meeting">Meeting</option>
            <option value="Study Session">Study Session</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div class="form-group">
          <label><i class="fas fa-calendar"></i> Date *</label>
          <input type="date" id="bk-date" class="form-input" value="${now.toISOString().split('T')[0]}"/>
        </div>
        <div class="form-group">
          <label><i class="fas fa-clock"></i> Start Time *</label>
          <input type="time" id="bk-start" class="form-input"/>
        </div>
        <div class="form-group">
          <label><i class="fas fa-clock"></i> End Time *</label>
          <input type="time" id="bk-end" class="form-input"/>
        </div>
        <div class="form-group full-width">
          <label><i class="fas fa-align-left"></i> Description</label>
          <textarea id="bk-desc" class="form-input" rows="2" placeholder="Optional details..."></textarea>
        </div>
      </div>`,
      onConfirm: () => saveBooking(roomId, roomName)
    });
  }

  async function showNewBooking() {
    const rooms = await DB.serverGetAll(DB.STORES.rooms);
    const campusRooms = rooms.filter(r => r.isCampus);
    UI.showModal({
      title: '<i class="fas fa-calendar-plus"></i> New Booking',
      body: `
      <div class="form-grid">
        <div class="form-group full-width">
          <label><i class="fas fa-door-open"></i> Select Room *</label>
          <select id="bk-room" class="form-input">
            <option value="">-- Select a room --</option>
            ${campusRooms.map(r => `<option value="${r.id}">${r.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group full-width">
          <label><i class="fas fa-heading"></i> Title *</label>
          <input type="text" id="bk-title" class="form-input" placeholder="e.g. CS101 Lecture"/>
        </div>
        <div class="form-group">
          <label><i class="fas fa-tag"></i> Type</label>
          <select id="bk-type" class="form-input">
            <option value="Class">Class</option>
            <option value="Event">Event</option>
            <option value="Meeting">Meeting</option>
            <option value="Study Session">Study Session</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div class="form-group">
          <label><i class="fas fa-calendar"></i> Date *</label>
          <input type="date" id="bk-date" class="form-input" value="${new Date().toISOString().split('T')[0]}"/>
        </div>
        <div class="form-group">
          <label><i class="fas fa-clock"></i> Start Time *</label>
          <input type="time" id="bk-start" class="form-input"/>
        </div>
        <div class="form-group">
          <label><i class="fas fa-clock"></i> End Time *</label>
          <input type="time" id="bk-end" class="form-input"/>
        </div>
        <div class="form-group full-width">
          <label><i class="fas fa-align-left"></i> Description</label>
          <textarea id="bk-desc" class="form-input" rows="2"></textarea>
        </div>
      </div>`,
      onConfirm: async () => {
        const roomId = parseInt(document.getElementById('bk-room').value);
        if (!roomId) { UI.showToast('Please select a room', 'error'); return false; }
        const room = await DB.dbGet(DB.STORES.rooms, roomId);
        return saveBooking(roomId, room ? room.name : 'Room');
      }
    });
  }

  async function saveBooking(roomId, roomName, existingId = null) {
    const title = document.getElementById('bk-title').value.trim();
    const date = document.getElementById('bk-date').value;
    const start = document.getElementById('bk-start').value;
    const end = document.getElementById('bk-end').value;
    if (!title || !date || !start || !end) { UI.showToast('Please fill all required fields', 'error'); return false; }
    const startTime = new Date(date + 'T' + start).toISOString();
    const endTime = new Date(date + 'T' + end).toISOString();
    if (new Date(endTime) <= new Date(startTime)) { UI.showToast('End time must be after start time', 'error'); return false; }
    // Conflict check
    const existing = await DB.dbGetByIndex(DB.STORES.bookings, 'roomId', roomId);
    const conflict = existing.find(b => {
      if (existingId && b.id === existingId) return false;
      const bs = new Date(b.startTime), be = new Date(b.endTime);
      const ns = new Date(startTime), ne = new Date(endTime);
      return ns < be && ne > bs;
    });
    if (conflict) { UI.showToast(`Conflict: "${conflict.title}" is booked at this time`, 'error'); return false; }
    const user = Auth.getCurrentUser();
    const data = {
      roomId, title,
      type: document.getElementById('bk-type').value,
      startTime, endTime,
      description: document.getElementById('bk-desc').value.trim(),
      userId: user.id,
      bookedBy: user.name,
      createdAt: new Date().toISOString()
    };
    if (existingId) { data.id = existingId; await DB.dbPut(DB.STORES.bookings, data); Sync.afterWrite(DB.STORES.bookings, data); UI.showToast('Booking updated!', 'success'); }
    else { const newId = await DB.dbAdd(DB.STORES.bookings, data); data.id = newId; Sync.afterWrite(DB.STORES.bookings, data); UI.showToast('Room booked successfully!', 'success'); }
    setTimeout(() => renderBookingsPage(), 350);
    return true;
  }

  async function showEditBooking(id) {
    const b = await DB.dbGet(DB.STORES.bookings, id);
    const room = await DB.dbGet(DB.STORES.rooms, b.roomId);
    const startDate = new Date(b.startTime);
    UI.showModal({
      title: '<i class="fas fa-edit"></i> Edit Booking',
      body: `
      <div class="form-grid">
        <div class="form-group full-width">
          <label><i class="fas fa-heading"></i> Title *</label>
          <input type="text" id="bk-title" class="form-input" value="${b.title}"/>
        </div>
        <div class="form-group">
          <label><i class="fas fa-tag"></i> Type</label>
          <select id="bk-type" class="form-input">
            <option value="Class" ${b.type === 'Class' ? 'selected' : ''}>Class</option>
            <option value="Event" ${b.type === 'Event' ? 'selected' : ''}>Event</option>
            <option value="Meeting" ${b.type === 'Meeting' ? 'selected' : ''}>Meeting</option>
            <option value="Study Session" ${b.type === 'Study Session' ? 'selected' : ''}>Study Session</option>
            <option value="Other" ${b.type === 'Other' ? 'selected' : ''}>Other</option>
          </select>
        </div>
        <div class="form-group">
          <label><i class="fas fa-calendar"></i> Date *</label>
          <input type="date" id="bk-date" class="form-input" value="${startDate.toISOString().split('T')[0]}"/>
        </div>
        <div class="form-group">
          <label><i class="fas fa-clock"></i> Start Time *</label>
          <input type="time" id="bk-start" class="form-input" value="${startDate.toTimeString().slice(0,5)}"/>
        </div>
        <div class="form-group">
          <label><i class="fas fa-clock"></i> End Time *</label>
          <input type="time" id="bk-end" class="form-input" value="${new Date(b.endTime).toTimeString().slice(0,5)}"/>
        </div>
        <div class="form-group full-width">
          <label><i class="fas fa-align-left"></i> Description</label>
          <textarea id="bk-desc" class="form-input" rows="2">${b.description || ''}</textarea>
        </div>
      </div>`,
      onConfirm: () => saveBooking(b.roomId, room ? room.name : 'Room', id)
    });
  }

  async function deleteBooking(id) {
    UI.showConfirm('Cancel this booking?', async () => {
      await DB.dbDelete(DB.STORES.bookings, id);
      Sync.afterDelete(DB.STORES.bookings, id);
      UI.showToast('Booking cancelled', 'info');
      renderBookingsPage();
    });
  }

  function formatDateTime(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString('en-UG', { weekday: 'short', month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString('en-UG', { hour: '2-digit', minute: '2-digit' });
  }

  function formatTime(iso) {
    return new Date(iso).toLocaleTimeString('en-UG', { hour: '2-digit', minute: '2-digit' });
  }

  return { renderBookingsPage, showBookingModal, showNewBooking, saveBooking, showEditBooking, deleteBooking, filterBookings };
})();

window.Booking = Booking;

function formatDateTime(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-UG', { weekday: 'short', month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString('en-UG', { hour: '2-digit', minute: '2-digit' });
}
function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('en-UG', { hour: '2-digit', minute: '2-digit' });
}
