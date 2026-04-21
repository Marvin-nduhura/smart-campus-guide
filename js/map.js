/**
 * Map module — OpenStreetMap via Leaflet
 * Real Kabale University coordinates: -1.2490°S, 29.9850°E
 * GPS capture uses the Geolocation API with high-accuracy mode.
 */
const MapModule = (() => {
  // Kabale University, Uganda — verified OSM coordinates
  const KU_LAT = -1.24900;
  const KU_LNG = 29.98500;
  const KU_ZOOM = 17;

  let map = null;
  let markers = {};
  let routeLayer = null;
  let userMarker = null;
  let userAccCircle = null;
  let _mapContainerId = null;

  // ── Init ────────────────────────────────────────────────────────────────────
  function initMap(containerId) {
    _mapContainerId = containerId;
    const container = document.getElementById(containerId);
    if (!container) return null;

    // If map already owns this container, just resize
    if (map && map.getContainer && map.getContainer() === container) {
      setTimeout(() => map.invalidateSize(), 50);
      return map;
    }

    // Destroy old instance cleanly
    if (map) {
      try { map.remove(); } catch (_) {}
      map = null;
      markers = {};
      routeLayer = null;
    }

    map = L.map(containerId, {
      center: [KU_LAT, KU_LNG],
      zoom: KU_ZOOM,
      zoomControl: false,
      attributionControl: true,
      preferCanvas: true   // better performance on mobile
    });

    // OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 20,
      minZoom: 5
    }).addTo(map);

    // Zoom control bottom-right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // GPS locate button
    const locCtrl = L.control({ position: 'bottomright' });
    locCtrl.onAdd = () => {
      const btn = L.DomUtil.create('div', 'leaflet-bar leaflet-control locate-btn');
      btn.innerHTML = '<a href="#" title="My Location"><i class="fas fa-crosshairs"></i></a>';
      L.DomEvent.on(btn, 'click', (e) => { L.DomEvent.preventDefault(e); locateUser(); });
      return btn;
    };
    locCtrl.addTo(map);

    // Invalidate size after CSS transition completes
    setTimeout(() => { if (map) map.invalidateSize(); }, 300);

    return map;
  }

  function getMap() { return map; }

  // ── Icons ───────────────────────────────────────────────────────────────────
  function createIcon(color, faIcon) {
    return L.divIcon({
      className: 'ku-marker-wrap',
      html: `<div class="map-marker" style="background:${color}"><i class="fas ${faIcon}"></i></div>`,
      iconSize: [38, 48],
      iconAnchor: [19, 48],
      popupAnchor: [0, -50]
    });
  }

  const CAT_COLOR = {
    Administration: '#B71C1C',   /* KAB Red for admin */
    Academic:       '#1B5E20',   /* KAB Green for academic */
    Library:        '#0A3D0A',   /* KAB Dark Green for library */
    'Student Services': '#C9A84C', /* KAB Gold for student services */
    Other:          '#4A148C',
    default:        '#1B5E20'
  };
  const CAT_ICON = {
    Administration: 'fa-landmark',
    Academic:       'fa-graduation-cap',
    Library:        'fa-book',
    'Student Services': 'fa-users',
    Other:          'fa-building',
    default:        'fa-building'
  };

  // ── Markers ─────────────────────────────────────────────────────────────────
  function addBuildingMarker(building) {
    if (!map) return null;
    if (!building.lat || !building.lng) return null;

    // Remove existing marker for this building first
    if (markers[building.id]) {
      try { markers[building.id].remove(); } catch (_) {}
      delete markers[building.id];
    }

    const color = CAT_COLOR[building.category] || CAT_COLOR.default;
    const icon  = CAT_ICON[building.category]  || CAT_ICON.default;

    const marker = L.marker([building.lat, building.lng], {
      icon: createIcon(color, icon),
      title: building.name
    });

    const desc = building.description
      ? building.description.substring(0, 90) + (building.description.length > 90 ? '…' : '')
      : '';

    marker.bindPopup(`
      <div class="map-popup">
        <div class="popup-header" style="background:${color}">
          <i class="fas ${icon}"></i> ${_esc(building.name)}
        </div>
        <div class="popup-body">
          <span class="popup-badge">${_esc(building.category || 'Building')}</span>
          ${desc ? `<p>${_esc(desc)}</p>` : ''}
          <div class="popup-actions">
            <button class="popup-btn" onclick="MapModule.getDirections(${building.lat},${building.lng})">
              <i class="fas fa-directions"></i> Directions
            </button>
            <button class="popup-btn popup-btn-outline" onclick="Router.navigate('building-detail',{id:${building.id}})">
              <i class="fas fa-info-circle"></i> Details
            </button>
          </div>
        </div>
      </div>`, { maxWidth: 270, className: 'custom-popup' });

    marker.addTo(map);
    markers[building.id] = marker;
    return marker;
  }

  function addRoomMarker(room, buildingName) {
    if (!map) return null;
    if (!room.lat || !room.lng) return null;

    const key = 'room_' + room.id;
    if (markers[key]) { try { markers[key].remove(); } catch (_) {} delete markers[key]; }

    const marker = L.marker([room.lat, room.lng], {
      icon: createIcon('#00838f', 'fa-door-open'),
      title: room.name
    });

    marker.bindPopup(`
      <div class="map-popup">
        <div class="popup-header" style="background:#00838f">
          <i class="fas fa-door-open"></i> ${_esc(room.name)}
        </div>
        <div class="popup-body">
          <span class="popup-badge">${_esc(buildingName || '')}</span>
          <p>Floor ${room.floor}${room.capacity ? ' • Capacity: ' + room.capacity : ''}</p>
          <button class="popup-btn" onclick="MapModule.getDirections(${room.lat},${room.lng})">
            <i class="fas fa-directions"></i> Directions
          </button>
        </div>
      </div>`, { maxWidth: 270, className: 'custom-popup' });

    marker.addTo(map);
    markers[key] = marker;
    return marker;
  }

  function clearMarkers() {
    Object.values(markers).forEach(m => { try { m.remove(); } catch (_) {} });
    markers = {};
  }

  function focusMarker(id) {
    const m = markers[id];
    if (!m || !map) return;
    map.setView(m.getLatLng(), 19, { animate: true, duration: 0.5 });
    setTimeout(() => m.openPopup(), 550);
  }

  function showAllMarkers(buildings) {
    clearMarkers();
    const valid = buildings.filter(b => b.lat && b.lng);
    if (!valid.length) return;
    valid.forEach(b => addBuildingMarker(b));
    const group = L.featureGroup(Object.values(markers));
    if (Object.keys(markers).length > 0) {
      map.fitBounds(group.getBounds().pad(0.25), { animate: true, duration: 0.6 });
    }
  }

  // ── GPS Location ─────────────────────────────────────────────────────────────
  function locateUser() {
    if (!navigator.geolocation) {
      UI.showToast('Geolocation is not supported by your browser', 'error');
      return;
    }
    UI.showToast('Getting your location…', 'info');
    navigator.geolocation.getCurrentPosition(
      pos => _onLocated(pos),
      err => _onLocateError(err),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  function _onLocated(pos) {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    const acc = pos.coords.accuracy; // metres

    if (userMarker) { try { userMarker.remove(); } catch (_) {} }
    if (userAccCircle) { try { userAccCircle.remove(); } catch (_) {} }

    userMarker = L.marker([lat, lng], {
      icon: L.divIcon({
        className: 'ku-marker-wrap',
        html: '<div class="user-marker-dot"></div>',
        iconSize: [18, 18],
        iconAnchor: [9, 9]
      }),
      zIndexOffset: 1000
    }).addTo(map).bindPopup(`<b>You are here</b><br><small>Accuracy: ±${Math.round(acc)}m</small>`);

    // Accuracy circle
    userAccCircle = L.circle([lat, lng], {
      radius: acc,
      color: '#2196f3',
      fillColor: '#2196f3',
      fillOpacity: 0.1,
      weight: 1
    }).addTo(map);

    map.setView([lat, lng], 18, { animate: true, duration: 0.8 });
    userMarker.openPopup();
    UI.showToast(`Location found (±${Math.round(acc)}m accuracy)`, 'success');
  }

  function _onLocateError(err) {
    const msgs = {
      1: 'Location access denied. Please allow location in browser settings.',
      2: 'Location unavailable. Check your GPS/network.',
      3: 'Location request timed out. Try again.'
    };
    UI.showToast(msgs[err.code] || 'Could not get location', 'error');
  }

  // Returns a Promise<{lat, lng}> — used by GPS capture in forms
  function getUserLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) { reject(new Error('Geolocation not supported')); return; }
      navigator.geolocation.getCurrentPosition(
        pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
        err => reject(err),
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
      );
    });
  }

  // ── Routing ──────────────────────────────────────────────────────────────────
  function getDirections(destLat, destLng) {
    if (!map) { UI.showToast('Open the map first', 'warning'); return; }
    UI.showToast('Getting your location for routing…', 'info');
    getUserLocation().then(({ lat, lng }) => {
      _drawRoute(lat, lng, destLat, destLng);
    }).catch(() => {
      UI.showToast('Enable location to get walking directions', 'warning');
    });
  }

  function _drawRoute(fromLat, fromLng, toLat, toLng) {
    if (routeLayer) { try { map.removeLayer(routeLayer); } catch (_) {} routeLayer = null; }

    // OSRM public routing API (foot profile)
    const url = `https://router.project-osrm.org/route/v1/foot/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`;

    fetch(url)
      .then(r => { if (!r.ok) throw new Error('OSRM error'); return r.json(); })
      .then(data => {
        if (!data.routes || !data.routes[0]) throw new Error('No route');
        routeLayer = L.geoJSON(data.routes[0].geometry, {
          style: { color: '#1a237e', weight: 5, opacity: 0.85, dashArray: '12,6', lineCap: 'round' }
        }).addTo(map);
        map.fitBounds(routeLayer.getBounds().pad(0.25), { animate: true });
        const km  = (data.routes[0].distance / 1000).toFixed(2);
        const min = Math.ceil(data.routes[0].duration / 60);
        UI.showToast(`Route: ${km} km  •  ~${min} min walk`, 'success');
      })
      .catch(() => {
        // Fallback straight line
        routeLayer = L.polyline([[fromLat, fromLng], [toLat, toLng]], {
          color: '#1a237e', weight: 4, dashArray: '10,6', opacity: 0.8
        }).addTo(map);
        map.fitBounds(routeLayer.getBounds().pad(0.25), { animate: true });
        UI.showToast('Straight-line route shown (no road data)', 'info');
      });
  }

  function clearRoute() {
    if (routeLayer) { try { map.removeLayer(routeLayer); } catch (_) {} routeLayer = null; }
  }

  function resetView() {
    if (map) map.setView([KU_LAT, KU_LNG], KU_ZOOM, { animate: true });
  }

  // HTML-escape helper to prevent XSS in popups
  function _esc(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  return {
    initMap, getMap,
    addBuildingMarker, addRoomMarker,
    clearMarkers, focusMarker, showAllMarkers,
    locateUser, getUserLocation,
    getDirections, clearRoute, resetView,
    KU_LAT, KU_LNG
  };
})();

window.MapModule = MapModule;
