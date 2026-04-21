// Timetable module
const Timetable = (() => {
  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const COLORS = ['#1a237e', '#e53935', '#2e7d32', '#f57c00', '#6a1b9a', '#00838f', '#c62828'];

  async function renderTimetablePage() {
    const app = document.getElementById('app');
    const user = Auth.getCurrentUser();
    const entries = await DB.dbGetByIndex(DB.STORES.timetable, 'userId', user.id);
    const rooms = await DB.serverGetAll(DB.STORES.rooms);
    const roomMap = {};
    rooms.forEach(r => roomMap[r.id] = r);

    app.innerHTML = `
    ${UI.renderNav('timetable')}
    <div class="page-content">
      <div class="page-header">
        <div>
          <h2><i class="fas fa-calendar-week"></i> My Timetable</h2>
          <p class="subtitle">${entries.length} class${entries.length !== 1 ? 'es' : ''} scheduled</p>
        </div>
        <button class="btn-primary" onclick="Timetable.showAddEntry()"><i class="fas fa-plus"></i> Add Class</button>
      </div>
      <div class="timetable-view-toggle">
        <button class="view-btn active" id="week-view-btn" onclick="Timetable.switchView('week',this)"><i class="fas fa-calendar-week"></i> Week</button>
        <button class="view-btn" id="list-view-btn" onclick="Timetable.switchView('list',this)"><i class="fas fa-list"></i> List</button>
      </div>
      <div id="timetable-content">
        ${renderWeekView(entries, roomMap)}
      </div>
    </div>
    ${UI.renderBottomNav('timetable')}`;
  }

  function renderWeekView(entries, roomMap) {
    const byDay = {};
    DAYS.forEach(d => byDay[d] = []);
    entries.forEach(e => { if (byDay[e.day]) byDay[e.day].push(e); });
    DAYS.forEach(d => byDay[d].sort((a, b) => a.startTime.localeCompare(b.startTime)));

    return `
    <div class="week-grid">
      ${DAYS.map(day => `
      <div class="day-column">
        <div class="day-header ${isToday(day) ? 'today' : ''}">${day.slice(0, 3)}</div>
        <div class="day-slots">
          ${byDay[day].length ? byDay[day].map(e => renderTimetableEntry(e, roomMap)).join('') :
            `<div class="empty-day"><i class="fas fa-coffee"></i></div>`}
        </div>
      </div>`).join('')}
    </div>`;
  }

  function renderListView(entries, roomMap) {
    if (!entries.length) return `<div class="empty-state"><i class="fas fa-calendar-times"></i><p>No classes yet. Add your first class!</p></div>`;
    const sorted = [...entries].sort((a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day) || a.startTime.localeCompare(b.startTime));
    let html = '';
    let lastDay = '';
    sorted.forEach(e => {
      if (e.day !== lastDay) {
        html += `<div class="list-day-header ${isToday(e.day) ? 'today' : ''}">${e.day}</div>`;
        lastDay = e.day;
      }
      html += renderTimetableEntryList(e, roomMap);
    });
    return `<div class="timetable-list">${html}</div>`;
  }

  function renderTimetableEntry(e, roomMap) {
    const room = roomMap[e.roomId];
    const color = COLORS[e.colorIndex % COLORS.length] || COLORS[0];
    return `
    <div class="tt-entry animate-fade-in" style="background:${color}" onclick="Timetable.showEntryDetail(${e.id})">
      <div class="tt-time">${e.startTime}–${e.endTime}</div>
      <div class="tt-subject">${e.subject}</div>
      ${e.lecturer ? `<div class="tt-lecturer">${e.lecturer}</div>` : ''}
      ${room ? `<div class="tt-room"><i class="fas fa-door-open"></i> ${room.name}</div>` : ''}
    </div>`;
  }

  function renderTimetableEntryList(e, roomMap) {
    const room = roomMap[e.roomId];
    const color = COLORS[e.colorIndex % COLORS.length] || COLORS[0];
    return `
    <div class="tt-list-entry animate-fade-in" style="border-left:4px solid ${color}">
      <div class="tt-list-time" style="color:${color}">${e.startTime} – ${e.endTime}</div>
      <div class="tt-list-body">
        <h4>${e.subject}</h4>
        ${e.lecturer ? `<p><i class="fas fa-chalkboard-teacher"></i> ${e.lecturer}</p>` : ''}
        ${room ? `<p><i class="fas fa-door-open"></i> ${room.name}</p>` : ''}
        ${e.notes ? `<p class="tt-notes">${e.notes}</p>` : ''}
      </div>
      <div class="tt-list-actions">
        <button class="btn-icon btn-edit" onclick="event.stopPropagation();Timetable.showEditEntry(${e.id})"><i class="fas fa-edit"></i></button>
        <button class="btn-icon btn-danger" onclick="event.stopPropagation();Timetable.deleteEntry(${e.id})"><i class="fas fa-trash"></i></button>
      </div>
    </div>`;
  }

  async function switchView(view, btn) {
    document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const user = Auth.getCurrentUser();
    const entries = await DB.dbGetByIndex(DB.STORES.timetable, 'userId', user.id);
    const rooms = await DB.serverGetAll(DB.STORES.rooms);
    const roomMap = {};
    rooms.forEach(r => roomMap[r.id] = r);
    const content = document.getElementById('timetable-content');
    content.innerHTML = view === 'week' ? renderWeekView(entries, roomMap) : renderListView(entries, roomMap);
  }

  function isToday(day) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date().getDay()] === day;
  }

  async function showEntryDetail(id) {
    const e = await DB.dbGet(DB.STORES.timetable, id);
    if (!e) return;
    const room = e.roomId ? await DB.dbGet(DB.STORES.rooms, e.roomId) : null;
    const color = COLORS[e.colorIndex % COLORS.length] || COLORS[0];
    UI.showModal({
      title: `<span style="color:${color}"><i class="fas fa-book"></i> ${e.subject}</span>`,
      body: `
      <div class="entry-detail">
        <div class="detail-row"><i class="fas fa-calendar-day" style="color:${color}"></i> <strong>${e.day}</strong></div>
        <div class="detail-row"><i class="fas fa-clock" style="color:${color}"></i> ${e.startTime} – ${e.endTime}</div>
        ${e.lecturer ? `<div class="detail-row"><i class="fas fa-chalkboard-teacher" style="color:${color}"></i> ${e.lecturer}</div>` : ''}
        ${room ? `<div class="detail-row"><i class="fas fa-door-open" style="color:${color}"></i> ${room.name}</div>` : ''}
        ${e.notes ? `<div class="detail-row"><i class="fas fa-sticky-note" style="color:${color}"></i> ${e.notes}</div>` : ''}
      </div>`,
      confirmText: '<i class="fas fa-edit"></i> Edit',
      onConfirm: () => { UI.closeModal(); showEditEntry(id); return true; }
    });
  }

  async function showAddEntry() {
    const rooms = await DB.serverGetAll(DB.STORES.rooms);
    UI.showModal({
      title: '<i class="fas fa-plus-circle"></i> Add Class',
      body: entryForm(rooms),
      onConfirm: saveEntry
    });
  }

  async function showEditEntry(id) {
    const e = await DB.dbGet(DB.STORES.timetable, id);
    const rooms = await DB.serverGetAll(DB.STORES.rooms);
    UI.showModal({
      title: '<i class="fas fa-edit"></i> Edit Class',
      body: entryForm(rooms, e),
      onConfirm: () => saveEntry(id)
    });
  }

  function entryForm(rooms, e = {}) {
    return `
    <div class="form-grid">
      <div class="form-group full-width">
        <label><i class="fas fa-book"></i> Subject / Course *</label>
        <input type="text" id="tt-subject" class="form-input" value="${e.subject || ''}" placeholder="e.g. Introduction to Computer Science"/>
      </div>
      <div class="form-group">
        <label><i class="fas fa-calendar-day"></i> Day *</label>
        <select id="tt-day" class="form-input">
          ${DAYS.map(d => `<option value="${d}" ${e.day === d ? 'selected' : ''}>${d}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label><i class="fas fa-clock"></i> Start Time *</label>
        <input type="time" id="tt-start" class="form-input" value="${e.startTime || ''}"/>
      </div>
      <div class="form-group">
        <label><i class="fas fa-clock"></i> End Time *</label>
        <input type="time" id="tt-end" class="form-input" value="${e.endTime || ''}"/>
      </div>
      <div class="form-group">
        <label><i class="fas fa-chalkboard-teacher"></i> Lecturer</label>
        <input type="text" id="tt-lecturer" class="form-input" value="${e.lecturer || ''}" placeholder="Lecturer name"/>
      </div>
      <div class="form-group">
        <label><i class="fas fa-door-open"></i> Room</label>
        <select id="tt-room" class="form-input">
          <option value="">-- Select room --</option>
          ${rooms.map(r => `<option value="${r.id}" ${e.roomId === r.id ? 'selected' : ''}>${r.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group full-width">
        <label><i class="fas fa-palette"></i> Color</label>
        <div class="color-picker">
          ${COLORS.map((c, i) => `<button type="button" class="color-dot ${(e.colorIndex || 0) === i ? 'selected' : ''}" style="background:${c}" onclick="Timetable.selectColor(${i},this)"></button>`).join('')}
        </div>
        <input type="hidden" id="tt-color" value="${e.colorIndex || 0}"/>
      </div>
      <div class="form-group full-width">
        <label><i class="fas fa-sticky-note"></i> Notes</label>
        <textarea id="tt-notes" class="form-input" rows="2" placeholder="Optional notes...">${e.notes || ''}</textarea>
      </div>
    </div>`;
  }

  function selectColor(index, btn) {
    document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('selected'));
    btn.classList.add('selected');
    document.getElementById('tt-color').value = index;
  }

  async function saveEntry(existingId = null) {
    const subject = document.getElementById('tt-subject').value.trim();
    const day = document.getElementById('tt-day').value;
    const startTime = document.getElementById('tt-start').value;
    const endTime = document.getElementById('tt-end').value;
    if (!subject || !day || !startTime || !endTime) { UI.showToast('Please fill required fields', 'error'); return false; }
    if (startTime >= endTime) { UI.showToast('End time must be after start time', 'error'); return false; }
    const user = Auth.getCurrentUser();
    const roomVal = document.getElementById('tt-room').value;
    const data = {
      userId: user.id,
      subject, day, startTime, endTime,
      lecturer: document.getElementById('tt-lecturer').value.trim(),
      roomId: roomVal ? parseInt(roomVal) : null,
      colorIndex: parseInt(document.getElementById('tt-color').value) || 0,
      notes: document.getElementById('tt-notes').value.trim(),
      createdAt: new Date().toISOString()
    };
    if (existingId) { data.id = existingId; await DB.dbPut(DB.STORES.timetable, data); Sync.afterWrite(DB.STORES.timetable, data); UI.showToast('Class updated!', 'success'); }
    else { const newId = await DB.dbAdd(DB.STORES.timetable, data); data.id = newId; Sync.afterWrite(DB.STORES.timetable, data); UI.showToast('Class added!', 'success'); }
    setTimeout(() => renderTimetablePage(), 350);
    return true;
  }

  async function deleteEntry(id) {
    UI.showConfirm('Remove this class from timetable?', async () => {
      await DB.dbDelete(DB.STORES.timetable, id);
      Sync.afterDelete(DB.STORES.timetable, id);
      UI.showToast('Class removed', 'info');
      renderTimetablePage();
    });
  }

  return { renderTimetablePage, switchView, showEntryDetail, showAddEntry, showEditEntry, saveEntry, deleteEntry, selectColor };
})();

window.Timetable = Timetable;
