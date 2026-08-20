/* ============================================================
   CONFIG
   ============================================================ */
const API = '/api';


/* ============================================================
   DATA
   ============================================================ */
let vlans         = [];   // all VLANs from /vlans/
let selectedVlan  = null; // currently selected VLAN object


/* ============================================================
   LOAD VLANS
   - Fetches all VLANs on page load
   - Renders them in the left column list
   ============================================================ */
async function loadVlans() {
    const list = document.getElementById('vlan-list');
    list.innerHTML = `<li style="padding:1rem; color:var(--color-text-faint); font-size:var(--text-xs);">Loading...</li>`;

    try {
        const res = await fetch(`${API}/vlans/`);
        if (!res.ok) throw new Error(`Server error: ${res.status}`);

        vlans = await res.json();
        console.log(`[OK] Loaded ${vlans.length} VLANs`);
        renderVlanList();

    } catch (error) {
        console.error('[ERROR] Could not load VLANs:', error);
        list.innerHTML = `<li style="padding:1rem; color:var(--color-text-faint);">Could not load VLANs</li>`;
        showToast('Could not load VLANs');
    }
}


/* ============================================================
   RENDER VLAN LIST
   - Builds list items in the left column
   - Shows VLAN name and whether it's management
   ============================================================ */
function renderVlanList() {
    const list = document.getElementById('vlan-list');

    if (!vlans.length) {
        list.innerHTML = `
            <li class="empty-state">
                <p>No VLANs found</p>
                <small>Add VLANs on the VLANs page</small>
            </li>`;
        return;
    }

    list.innerHTML = vlans.map(v => {
        const active = selectedVlan?.id === v.id;
        return `
            <li class="list-item ${active ? 'active' : ''}"
                role="option"
                aria-selected="${active}"
                tabindex="0"
                data-action="select-vlan"
                data-id="${v.id}">
                <div style="display:flex; flex-direction:column; gap:2px; flex:1; overflow:hidden;">
                    <span class="item-label">${esc(v.name)}</span>
                    <span style="font-size:0.8rem; opacity:0.7; font-family:monospace;">
                        ${esc(v.ip_range)}
                    </span>
                </div>
                <span class="type-pill ${v.is_mgmt ? 'type-MGMT' : 'type-DEFAULT'}"
                      style="font-size:0.7rem; padding: 1px 6px;">
                    ${v.is_mgmt ? 'MGMT' : 'STD'}
                </span>
            </li>`;
    }).join('');
}


/* ============================================================
   LOAD FREE IPs
   - Called when user clicks a VLAN
   - Fetches from GET /free_ips/{vlan_id}
   - Renders results in the right column
   ============================================================ */
async function loadFreeIps(vlanId) {
    const body = document.getElementById('ip-body');

    // Show loading state immediately
    body.innerHTML = `
        <div class="empty-state">
            <p style="color:var(--color-text-muted);">Loading free IPs...</p>
        </div>`;

    try {
        const res = await fetch(`${API}/free_ips/${vlanId}`);
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || `Server error: ${res.status}`);
        }

        const data = await res.json();
        console.log(`[OK] ${data.total_free} free IPs in ${data.vlan_name}`);
        renderFreeIps(data);

    } catch (error) {
        console.error('[ERROR] Could not load free IPs:', error);
        body.innerHTML = `
            <div class="empty-state">
                <p>Could not load free IPs</p>
                <small>${esc(error.message)}</small>
            </div>`;
        showToast('Could not load free IPs');
    }
}


/* ============================================================
   RENDER FREE IPs
   - Builds the right column content
   - Shows stats banner + IP grid
   ============================================================ */
function renderFreeIps(data) {
    const body = document.getElementById('ip-body');

    // Empty — no free IPs available
    if (!data.free_ips.length) {
        body.innerHTML = `
            <div class="detail-scroll">
                <div class="server-banner">
                    ${vlanBanner(data)}
                </div>
                <div class="empty-state">
                    <p>No free IPs available</p>
                    <small>All addresses in ${esc(data.ip_range)} are in use</small>
                </div>
            </div>`;
        return;
    }

    // Build IP grid — each IP as a small pill
    const ipPills = data.free_ips.map(ip => `
        <span class="ip-pill" title="${esc(ip)}">${esc(ip)}</span>
    `).join('');

    body.innerHTML = `
        <div class="detail-scroll">

            <!-- Stats banner -->
            <div class="server-banner">
                ${vlanBanner(data)}
            </div>

            <!-- Stats row -->
            <div class="freeip-stats">
                <div class="freeip-stat">
                    <span class="freeip-stat-value">${data.total_free}</span>
                    <span class="freeip-stat-label">Free</span>
                </div>
                <div class="freeip-stat-divider"></div>
                <div class="freeip-stat">
                    <span class="freeip-stat-value">${data.total_used}</span>
                    <span class="freeip-stat-label">Used</span>
                </div>
                <div class="freeip-stat-divider"></div>
                <div class="freeip-stat">
                    <span class="freeip-stat-value">${data.total_free + data.total_used}</span>
                    <span class="freeip-stat-label">Total hosts</span>
                </div>
            </div>

            <!-- IP grid -->
            <div class="freeip-grid-wrapper">
                <div class="freeip-section-label">Available addresses</div>
                <div class="freeip-grid">
                    ${ipPills}
                </div>
            </div>

        </div>`;
}


/* ============================================================
   VLAN BANNER
   - Reusable banner HTML for the selected VLAN
   ============================================================ */
function vlanBanner(data) {
    return `
        <div class="server-icon" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="5" r="2"/>
                <circle cx="5"  cy="19" r="2"/>
                <circle cx="19" cy="19" r="2"/>
                <path d="M12 7v4M5 17l7-6 7 6"/>
            </svg>
        </div>
        <div class="server-info">
            <div class="server-hostname">${esc(data.vlan_name)}</div>
            <div class="server-group">${esc(data.ip_range)}</div>
        </div>`;
}


/* ============================================================
   SELECT VLAN
   - Updates selected state, re-renders list, loads IPs
   ============================================================ */
function selectVlan(vlanId) {
    selectedVlan = vlans.find(v => v.id === vlanId) || null;
    renderVlanList();        // re-render to show active state
    loadFreeIps(vlanId);     // fetch and show free IPs
}


/* ============================================================
   SHOW EMPTY DETAIL
   - Default right column state when no VLAN is selected
   ============================================================ */
function showEmptyDetail() {
    document.getElementById('ip-body').innerHTML = `
        <div class="empty-state">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                <circle cx="12" cy="5" r="2"/>
                <circle cx="5"  cy="19" r="2"/>
                <circle cx="19" cy="19" r="2"/>
                <path d="M12 7v4M5 17l7-6 7 6"/>
            </svg>
            <p>No VLAN selected</p>
            <small>Select a VLAN to see available IP addresses</small>
        </div>`;
}


/* ============================================================
   EVENT LISTENERS
   ============================================================ */
document.addEventListener('click', e => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const action = el.dataset.action;
    const id     = Number(el.dataset.id);

    if (action === 'select-vlan') selectVlan(id);
});

// Keyboard accessibility
document.addEventListener('keydown', e => {
    const el = e.target.closest('[data-action]');
    if (el && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        el.click();
    }
});


/* ============================================================
   TOAST
   ============================================================ */
let _toastTimer;
function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
}


/* ============================================================
   XSS ESCAPE
   ============================================================ */
function esc(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}


/* ============================================================
   BOOT
   ============================================================ */
showEmptyDetail();
loadVlans();
