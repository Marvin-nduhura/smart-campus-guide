// Buildings & Rooms module
const Buildings = (() => {

  async function renderBuildingsPage() {
    const app = document.getElementById('app');
    const buildings = await DB.dbGetAll(DB.STORES.buildings);
    const canEdit = Auth.canEdit();
    app.innerHTML = `
    ${UI.renderNav('buildings')}
    <div class="page-content">
      <div class="page-header">
        <div>
          <h2><i class="fas fa-building"></i> Campus Buildings</h2>
          <p class="subtitle">${buildings.length} buildings on campus</p>
        </div>
        ${canEdit ? `<button class="btn-primary" onclick="Buildings.showAddBuilding()"><i class="fas fa-plus"></i> Add Building</button>` : ''}
      </div>
      <div class="search-bar-wrap">
        <div class="search-bar">
          <i class="fas fa-search"></i>
          <input type="text" id="building-search" placeholder="Search buildings..." oninput="Buildings.filterBuildings(this.value)"/>
          <button class="clear-search hidden" id="clear-search" onclick="Buildings.clearSearch()"><i class="fas fa-times"></i></button>
        </div>
        <div class="filter-chips" id="category-filters">
          <button class="chip active" onclick="Buildings.filterByCategory('all', this)">All</button>
          <button class="chip" onclick="Buildings.filterByCategory('Academic', this)"><i class="fas fa-graduation-cap"></i> Academic</button>
          <button class="chip" onclick="Buildings.filterByCategory('Administration', this)"><i class="fas fa-landmark"></i> Admin</button>
          <button class="chip" onclick="Buildings.filterByCategory('Library', this)"><i class="fas fa-book"></i> Library</button>
          <button class="chip" onclick="Buildings.filterByCategory('Student Services', this)"><i class="fas fa-users"></i> Student</button>
        </div>
      </div>
      <div class="buildings-grid" id="buildings-grid">
        ${buildings.length ? buildings.map(b => renderBuildingCard(b)).join('') : '<div class="empty-state"><i class="fas fa-building"></i><p>No buildings added yet</p></div>'}
      </div>
    </div>
    ${UI.renderBottomNav('buildings')}`;
  }

  function renderBuildingCard(b) {
    const colors = { Administration: '#B71C1C', Academic: '#1B5E20', Library: '#0A3D0A', 'Student Services': '#C9A84C', default: '#1B5E20' };
    const icons = { Administration: 'fa-landmark', Academic: 'fa-graduation-cap', Library: 'fa-book', 'Student Services': 'fa-users', default: 'fa-building' };
    const color = colors[b.category] || colors.default;
    const icon = icons[b.category] || icons.default;
    const canEdit = Auth.canEdit();
    return `
    <div class="building-card animate-fade-in" data-id="${b.id}" data-name="${b.name.toLowerCase()}" data-category="${b.category || ''}">
      <div class="card-image" style="background:${color}20;border-bottom:3px solid ${color}">
        ${b.image ? `<img src="${b.image}" alt="${b.name}" loading="lazy"/>` : `<div class="card-icon-placeholder" style="color:${color}"><i class="fas ${icon}"></i></div>`}
        <span class="card-badge" style="background:${color}">${b.category || 'Building'}</span>
        ${b.floors ? `<span class="card-floors"><i class="fas fa-layer-group"></i> ${b.floors} floors</span>` : ''}
      </div>
      <div class="card-body">
        <h3 class="card-title">${b.name}</h3>
        <p class="card-desc">${b.description ? b.description.substring(0, 80) + '...' : 'No description'}</p>
        <div class="card-actions">
          <button class="btn-icon" title="View on Map" onclick="Buildings.viewOnMap(${b.id},${b.lat},${b.lng})">
            <i class="fas fa-map-marker-alt"></i>
          </button>
          <button class="btn-icon" title="Get Directions" onclick="Buildings.getDirections(${b.lat},${b.lng})">
            <i class="fas fa-directions"></i>
          </button>
          <button class="btn-icon" title="View Rooms" onclick="Router.navigate('building-detail',{id:${b.id}})">
            <i class="fas fa-door-open"></i>
          </button>
          ${canEdit ? `
          <button class="btn-icon btn-edit" title="Edit" onclick="Buildings.showEditBuilding(${b.id})">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn-icon btn-danger" title="Delete" onclick="Buildings.deleteBuilding(${b.id})">
            <i class="fas fa-trash"></i>
          </button>` : ''}
        </div>
      </div>
    </div>`;
  }

  function filterBuildings(query) {
    const cards = document.querySelectorAll('.building-card');
    const clearBtn = document.getElementById('clear-search');
    clearBtn.classList.toggle('hidden', !query);
    cards.forEach(card => {
      const name = card.dataset.name || '';
      card.style.display = name.includes(query.toLowerCase()) ? '' : 'none';
    });
  }

  function clearSearch() {
    document.getElementById('building-search').value = '';
    filterBuildings('');
  }

  function filterByCategory(cat, btn) {
    document.querySelectorAll('.filter-chips .chip').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    const cards = document.querySelectorAll('.building-card');
    cards.forEach(card => {
      card.style.display = (cat === 'all' || card.dataset.category === cat) ? '' : 'none';
    });
  }

  function viewOnMap(id, lat, lng) {
    Router.navigate('map');
    setTimeout(async () => {
      const buildings = await DB.dbGetAll(DB.STORES.buildings);
      buildings.forEach(b => MapModule.addBuildingMarker(b));
      MapModule.focusMarker(id);
    }, 600);
  }

  function getDirections(lat, lng) {
    Router.navigate('map');
    setTimeout(() => MapModule.getDirections(lat, lng), 600);
  }

  async function renderBuildingDetail(params) {
    const app = document.getElementById('app');
    // Ensure id is always a number
    const buildingId = parseInt(params.id, 10);
    if (!buildingId) { app.innerHTML = '<div class="not-found"><i class="fas fa-exclamation-triangle"></i><h2>Building not found</h2></div>'; return; }
    const building = await DB.dbGet(DB.STORES.buildings, buildingId);
    if (!building) { app.innerHTML = '<div class="not-found"><i class="fas fa-exclamation-triangle"></i><h2>Building not found</h2></div>'; return; }
    const rooms = await DB.dbGetByIndex(DB.STORES.rooms, 'buildingId', buildingId);
    const canEdit = Auth.canEdit();
    const colors = { Administration: '#B71C1C', Academic: '#1B5E20', Library: '#0A3D0A', 'Student Services': '#C9A84C', default: '#1B5E20' };
    const color = colors[building.category] || colors.default;
    app.innerHTML = `
    ${UI.renderNav('buildings')}
    <div class="detail-page-content">
      <div class="detail-hero" style="background:linear-gradient(135deg,${color} 0%,${color}bb 100%);margin:-0px -16px 0;padding-left:16px;padding-right:16px">
        <button class="back-btn" onclick="Router.navigate('buildings')"><i class="fas fa-arrow-left"></i></button>
        ${building.image ? `<img src="${building.image}" class="detail-hero-img" alt="${building.name}"/>` : `<div class="detail-hero-icon"><i class="fas fa-building"></i></div>`}
        <div class="detail-hero-info">
          <span class="detail-badge">${building.category || 'Building'}</span>
          <h2>${building.name}</h2>
          <p>${building.floors ? building.floors + ' floor(s)' : ''}</p>
        </div>
      </div>
      <div class="detail-body">
        <div class="detail-desc-card">
          <h4><i class="fas fa-info-circle"></i> About</h4>
          <p>${building.description || 'No description available.'}</p>
        </div>
        <div class="detail-actions-row">
          <button class="btn-action" onclick="Buildings.viewOnMap(${building.id},${building.lat},${building.lng})">
            <i class="fas fa-map-marker-alt"></i><span>View on Map</span>
          </button>
          <button class="btn-action" onclick="Buildings.getDirections(${building.lat},${building.lng})">
            <i class="fas fa-directions"></i><span>Directions</span>
          </button>
          ${canEdit ? `<button class="btn-action btn-action-edit" onclick="Buildings.showEditBuilding(${building.id})">
            <i class="fas fa-edit"></i><span>Edit</span>
          </button>` : ''}
        </div>
        <div class="rooms-section">
          <div class="section-header">
            <h3><i class="fas fa-door-open"></i> Rooms (${rooms.length})</h3>
            ${canEdit ? `<button class="btn-primary btn-sm" onclick="Buildings.showAddRoom(${building.id})"><i class="fas fa-plus"></i> Add Room</button>` : ''}
          </div>
          ${rooms.length ? `
          <div class="floors-tabs" id="floors-tabs">
            ${[...new Set(rooms.map(r => r.floor))].sort((a,b)=>a-b).map((f, i) =>
              `<button class="floor-tab ${i === 0 ? 'active' : ''}" onclick="Buildings.filterByFloor(${f}, this)">Floor ${f}</button>`
            ).join('')}
            <button class="floor-tab" onclick="Buildings.filterByFloor('all', this)">All</button>
          </div>
          <div class="rooms-grid" id="rooms-grid">
            ${rooms.map(r => renderRoomCard(r, building, canEdit)).join('')}
          </div>` : `<div class="empty-state"><i class="fas fa-door-closed"></i><p>No rooms added yet</p>${canEdit ? `<button class="btn-primary" onclick="Buildings.showAddRoom(${building.id})"><i class="fas fa-plus"></i> Add First Room</button>` : ''}</div>`}
        </div>
      </div>
    </div>
    ${UI.renderBottomNav('buildings')}`;
  }

  function renderRoomCard(r, building, canEdit) {
    return `
    <div class="room-card animate-fade-in" data-floor="${r.floor}">
      <div class="room-card-header">
        ${r.image ? `<img src="${r.image}" alt="${r.name}" class="room-img"/>` : `<div class="room-icon-placeholder"><i class="fas fa-door-open"></i></div>`}
        <span class="floor-badge">Floor ${r.floor}</span>
      </div>
      <div class="room-card-body">
        <h4>${r.name}</h4>
        <p>${r.description ? r.description.substring(0, 60) + '...' : ''}</p>
        ${r.capacity ? `<span class="capacity-badge"><i class="fas fa-users"></i> ${r.capacity}</span>` : ''}
        <div class="room-actions">
          <button class="btn-icon" onclick="Buildings.viewRoomOnMap(${r.id},${r.lat},${r.lng},'${r.name.replace(/'/g, "\\'")}','${building.name.replace(/'/g, "\\'")}')">
            <i class="fas fa-map-marker-alt"></i>
          </button>
          <button class="btn-icon" onclick="MapModule.getDirections(${r.lat},${r.lng});Router.navigate('map')">
            <i class="fas fa-directions"></i>
          </button>
          ${Auth.getCurrentUser() && Auth.getCurrentUser().role !== 'visitor' ? `
          <button class="btn-icon btn-book" onclick="Booking.showBookingModal(${r.id},'${r.name.replace(/'/g, "\\'")}')">
            <i class="fas fa-calendar-plus"></i>
          </button>` : ''}
          ${canEdit ? `
          <button class="btn-icon btn-edit" onclick="Buildings.showEditRoom(${r.id},${building.id})"><i class="fas fa-edit"></i></button>
          <button class="btn-icon btn-danger" onclick="Buildings.deleteRoom(${r.id},${building.id})"><i class="fas fa-trash"></i></button>` : ''}
        </div>
      </div>
    </div>`;
  }

  function filterByFloor(floor, btn) {
    document.querySelectorAll('.floor-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.room-card').forEach(card => {
      card.style.display = (floor === 'all' || parseInt(card.dataset.floor) === floor) ? '' : 'none';
    });
  }

  function viewRoomOnMap(id, lat, lng, roomName, buildingName) {
    Router.navigate('map');
    setTimeout(() => {
      MapModule.addRoomMarker({ id, lat, lng, name: roomName, floor: 1 }, buildingName);
      MapModule.focusMarker('room_' + id);
    }, 600);
  }

  function showAddBuilding() {
    UI.showModal({
      title: '<i class="fas fa-plus-circle"></i> Add New Building',
      body: buildingForm(),
      onConfirm: saveBuilding
    });
  }

  async function showEditBuilding(id) {
    const b = await DB.dbGet(DB.STORES.buildings, id);
    UI.showModal({
      title: '<i class="fas fa-edit"></i> Edit Building',
      body: buildingForm(b),
      onConfirm: () => saveBuilding(id)
    });
  }

  function buildingForm(b = {}) {
    return `
    <div class="form-grid">
      <div class="form-group">
        <label><i class="fas fa-building"></i> Building Name *</label>
        <input type="text" id="b-name" class="form-input" value="${b.name || ''}" placeholder="e.g. Main Library"/>
      </div>
      <div class="form-group">
        <label><i class="fas fa-tag"></i> Category</label>
        <select id="b-category" class="form-input">
          <option value="Academic" ${b.category === 'Academic' ? 'selected' : ''}>Academic</option>
          <option value="Administration" ${b.category === 'Administration' ? 'selected' : ''}>Administration</option>
          <option value="Library" ${b.category === 'Library' ? 'selected' : ''}>Library</option>
          <option value="Student Services" ${b.category === 'Student Services' ? 'selected' : ''}>Student Services</option>
          <option value="Other" ${b.category === 'Other' ? 'selected' : ''}>Other</option>
        </select>
      </div>
      <div class="form-group full-width">
        <label><i class="fas fa-align-left"></i> Description</label>
        <textarea id="b-desc" class="form-input" rows="3" placeholder="Brief description...">${b.description || ''}</textarea>
      </div>
      <div class="form-group">
        <label><i class="fas fa-layer-group"></i> Number of Floors</label>
        <input type="number" id="b-floors" class="form-input" value="${b.floors || 1}" min="1" max="20"/>
      </div>
      <div class="form-group">
        <label><i class="fas fa-map-marker-alt"></i> Latitude</label>
        <input type="number" id="b-lat" class="form-input" value="${b.lat || ''}" step="0.0001" placeholder="e.g. -1.2490"/>
      </div>
      <div class="form-group">
        <label><i class="fas fa-map-marker-alt"></i> Longitude</label>
        <input type="number" id="b-lng" class="form-input" value="${b.lng || ''}" step="0.0001" placeholder="e.g. 29.9850"/>
      </div>
      <div class="form-group full-width">
        <button class="btn-secondary btn-sm" onclick="Buildings.useCurrentLocation('b-lat','b-lng')">
          <i class="fas fa-crosshairs"></i> Use Current GPS Location
        </button>
      </div>
      <div class="form-group full-width">
        <label><i class="fas fa-image"></i> Building Image (URL or Base64)</label>
        <input type="text" id="b-image" class="form-input" value="${b.image || ''}" placeholder="Paste image URL..."/>
        <small>Or upload: <input type="file" accept="image/*" onchange="UI.handleImageUpload(this,'b-image')"/></small>
      </div>
    </div>`;
  }

  async function saveBuilding(existingId = null) {
    const name = document.getElementById('b-name').value.trim();
    const lat = parseFloat(document.getElementById('b-lat').value);
    const lng = parseFloat(document.getElementById('b-lng').value);
    if (!name) { UI.showToast('Building name is required', 'error'); return false; }
    if (isNaN(lat) || isNaN(lng)) { UI.showToast('Valid coordinates are required', 'error'); return false; }
    const data = {
      name,
      category: document.getElementById('b-category').value,
      description: document.getElementById('b-desc').value.trim(),
      floors: parseInt(document.getElementById('b-floors').value) || 1,
      lat, lng,
      image: document.getElementById('b-image').value || null,
      isCampus: true,
      createdAt: new Date().toISOString()
    };
    if (existingId) {
      data.id = existingId;
      await DB.dbPut(DB.STORES.buildings, data);
      Sync.afterWrite(DB.STORES.buildings, data);
      UI.showToast('Building updated!', 'success');
    } else {
      const newId = await DB.dbAdd(DB.STORES.buildings, data);
      data.id = newId;
      Sync.afterWrite(DB.STORES.buildings, data);
      UI.showToast('Building added!', 'success');
    }
    setTimeout(() => renderBuildingsPage(), 350);
    return true;
  }

  async function deleteBuilding(id) {
    UI.showConfirm('Delete this building? All its rooms will also be deleted.', async () => {
      const rooms = await DB.dbGetByIndex(DB.STORES.rooms, 'buildingId', id);
      for (const r of rooms) {
        await DB.dbDelete(DB.STORES.rooms, r.id);
        Sync.afterDelete(DB.STORES.rooms, r.id);
      }
      await DB.dbDelete(DB.STORES.buildings, id);
      Sync.afterDelete(DB.STORES.buildings, id);
      UI.showToast('Building deleted', 'info');
      renderBuildingsPage();
    });
  }

  function showAddRoom(buildingId) {
    UI.showModal({
      title: '<i class="fas fa-plus-circle"></i> Add Room',
      body: roomForm(buildingId),
      onConfirm: () => saveRoom(null, buildingId)
    });
  }

  async function showEditRoom(roomId, buildingId) {
    const r = await DB.dbGet(DB.STORES.rooms, roomId);
    UI.showModal({
      title: '<i class="fas fa-edit"></i> Edit Room',
      body: roomForm(buildingId, r),
      onConfirm: () => saveRoom(roomId, buildingId)
    });
  }

  function roomForm(buildingId, r = {}) {
    return `
    <div class="form-grid">
      <div class="form-group">
        <label><i class="fas fa-door-open"></i> Room Name *</label>
        <input type="text" id="r-name" class="form-input" value="${r.name || ''}" placeholder="e.g. Computer Lab 1"/>
      </div>
      <div class="form-group">
        <label><i class="fas fa-layer-group"></i> Floor Number *</label>
        <input type="number" id="r-floor" class="form-input" value="${r.floor || 1}" min="1" max="20"/>
      </div>
      <div class="form-group full-width">
        <label><i class="fas fa-align-left"></i> Description</label>
        <textarea id="r-desc" class="form-input" rows="2" placeholder="Room description...">${r.description || ''}</textarea>
      </div>
      <div class="form-group">
        <label><i class="fas fa-users"></i> Capacity</label>
        <input type="number" id="r-capacity" class="form-input" value="${r.capacity || ''}" min="1" placeholder="e.g. 40"/>
      </div>
      <div class="form-group">
        <label><i class="fas fa-map-marker-alt"></i> Latitude</label>
        <input type="number" id="r-lat" class="form-input" value="${r.lat || ''}" step="0.0001"/>
      </div>
      <div class="form-group">
        <label><i class="fas fa-map-marker-alt"></i> Longitude</label>
        <input type="number" id="r-lng" class="form-input" value="${r.lng || ''}" step="0.0001"/>
      </div>
      <div class="form-group full-width">
        <button class="btn-secondary btn-sm" onclick="Buildings.useCurrentLocation('r-lat','r-lng')">
          <i class="fas fa-crosshairs"></i> Use Current GPS Location
        </button>
      </div>
      <div class="form-group full-width">
        <label><i class="fas fa-image"></i> Room Image</label>
        <input type="text" id="r-image" class="form-input" value="${r.image || ''}" placeholder="Paste image URL..."/>
        <small>Or upload: <input type="file" accept="image/*" onchange="UI.handleImageUpload(this,'r-image')"/></small>
      </div>
    </div>`;
  }

  async function saveRoom(existingId, buildingId) {
    const name = document.getElementById('r-name').value.trim();
    const floor = parseInt(document.getElementById('r-floor').value);
    const lat = parseFloat(document.getElementById('r-lat').value);
    const lng = parseFloat(document.getElementById('r-lng').value);
    if (!name) { UI.showToast('Room name is required', 'error'); return false; }
    if (isNaN(lat) || isNaN(lng)) { UI.showToast('Valid coordinates are required', 'error'); return false; }
    const data = {
      buildingId, name, floor,
      description: document.getElementById('r-desc').value.trim(),
      capacity: parseInt(document.getElementById('r-capacity').value) || null,
      lat, lng,
      image: document.getElementById('r-image').value || null,
      isCampus: true,
      createdAt: new Date().toISOString()
    };
    if (existingId) {
      data.id = existingId;
      await DB.dbPut(DB.STORES.rooms, data);
      Sync.afterWrite(DB.STORES.rooms, data);
      UI.showToast('Room updated!', 'success');
    } else {
      const newId = await DB.dbAdd(DB.STORES.rooms, data);
      data.id = newId;
      Sync.afterWrite(DB.STORES.rooms, data);
      UI.showToast('Room added!', 'success');
    }
    setTimeout(() => renderBuildingDetail({ id: buildingId }), 350);
    return true;
  }

  async function deleteRoom(roomId, buildingId) {
    UI.showConfirm('Delete this room?', async () => {
      await DB.dbDelete(DB.STORES.rooms, roomId);
      Sync.afterDelete(DB.STORES.rooms, roomId);
      UI.showToast('Room deleted', 'info');
      renderBuildingDetail({ id: buildingId });
    });
  }

  function useCurrentLocation(latId, lngId) {
    MapModule.getUserLocation().then(({ lat, lng }) => {
      document.getElementById(latId).value = lat.toFixed(6);
      document.getElementById(lngId).value = lng.toFixed(6);
      UI.showToast('Location captured!', 'success');
    }).catch(() => UI.showToast('Could not get location. Enable GPS.', 'error'));
  }

  return { renderBuildingsPage, renderBuildingDetail, filterBuildings, clearSearch, filterByCategory, filterByFloor, viewOnMap, getDirections, viewRoomOnMap, showAddBuilding, showEditBuilding, saveBuilding, deleteBuilding, showAddRoom, showEditRoom, saveRoom, deleteRoom, useCurrentLocation };
})();

window.Buildings = Buildings;
