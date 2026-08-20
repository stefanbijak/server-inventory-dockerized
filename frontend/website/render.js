/* ============================================================
   RENDER — builds the UI from current state and DB
   ============================================================ */

function render() {
    renderBreadcrumb();
    renderGroups();
    renderServers();
    renderDetails();
    syncAddBtns();
}

function renderBreadcrumb() {
    const el = document.getElementById('breadcrumb');
    if (!el) return;
    const g = getGroup(), s = getServer();
    if (!g) { el.innerHTML = ''; return; }
    let html = `<span class="crumb" tabindex="0" data-action="crumb-group">${esc(g.name)}</span>`;
    if (s) html += `<span class="sep" aria-hidden="true">›</span><span>${esc(s.hostname)}</span>`;
    el.innerHTML = html;
}

function renderGroups() {
    const list = document.getElementById('group-list');
    if (!DB.groups.length) {
        list.innerHTML = emptyHtml(iconServer(), 'No groups yet', 'Click + to create your first group');
        return;
    }
    list.innerHTML = DB.groups.map(g => {
        const active = g.id === state.groupId;
        return `
            <li class="list-item${active ? ' active' : ''}"
                role="option" aria-selected="${active}"
                tabindex="0" data-action="select-group" data-id="${g.id}">
                <span class="item-label">${esc(g.name)}</span>
                <span class="item-badge">${(g.servers || []).length}</span>
            </li>`;
    }).join('');
}

function renderServers() {
    const list = document.getElementById('server-list');
    const g = getGroup();
    if (!g) {
        list.innerHTML = emptyHtml(iconServer(), 'No group selected', 'Select a group to see its servers');
        return;
    }
    const items = g.servers.length
        ? g.servers.map(s => {
            const active = s.id === state.serverId;
            return `
                <li class="list-item${active ? ' active' : ''}"
                    role="option" aria-selected="${active}"
                    tabindex="0" data-action="select-server" data-id="${s.id}">
                    <span class="item-label">${esc(s.hostname)}</span>
                    <span class="item-chevron" aria-hidden="true">›</span>
                </li>`;
        }).join('')
        : `<li>${emptyHtml(iconServer(), 'No servers', 'Click + to add a server')}</li>`;

    list.innerHTML = `
        <ul class="list">${items}</ul>
        <div class="detail-footer">
            <button class="btn btn-primary" data-action="edit-group" data-id="${g.id}">Edit Group</button>
            <button class="btn btn-ghost"   data-action="delete-group" data-id="${g.id}">Delete</button>
        </div>`;
}

function renderDetails() {
    const body = document.getElementById('detail-body');
    const s = getServer(), g = getGroup();
    if (!s) {
        body.innerHTML = emptyHtml(iconNet(), 'No server selected', 'Select a server to inspect its interfaces');
        return;
    }
    const typeClass = lbl => ({ MGMT: 'type-MGMT', MULTICAST: 'type-MULTICAST', PUBLIC: 'type-PUBLIC' })[lbl] || 'type-DEFAULT';
    const rows = (s.networking || []).map(n => `
        <tr>
            <td><span class="ip-addr">${esc(n.ip)}</span></td>
            <td><span class="vlan-pill">${esc(n.vlan)}</span></td>
            <td><span class="type-pill ${typeClass(n.label)}">${esc(n.label)}</span></td>
            <td style="text-align:right;">
                <button class="btn-delete-iface" data-action="delete-iface" data-id="${n.id}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                    Remove
                </button>
            </td>
        </tr>`).join('');

    body.innerHTML = `
        <div class="detail-scroll">
            <div class="server-banner">
                <div class="server-icon">${iconServerSm()}</div>
                <div class="server-info">
                    <div class="server-hostname">${esc(s.hostname)}</div>
                    <div class="server-group">${esc(g.name)} · ${s.networking.length} interface${s.networking.length !== 1 ? 's' : ''}</div>
                </div>
            </div>
            ${s.networking.length
                ? `<table class="details-table">
                    <thead><tr>
                        <th>IP Address</th><th>VLAN</th><th>IP Range</th><th style="text-align:right;">Actions</th>
                    </tr></thead>
                    <tbody>${rows}</tbody>
                   </table>`
                : emptyHtml(iconNet(), 'No interfaces', 'Click + to add a network interface')
            }
        </div>
        <div class="detail-footer">
            <button class="btn btn-primary" data-action="edit-server">Edit Configuration</button>
            <button class="btn btn-ghost"   data-action="delete-server">Remove</button>
        </div>`;
}

function syncAddBtns() {
    const g = getGroup(), s = getServer();
    document.getElementById('btn-add-server').disabled = !g;
    document.getElementById('btn-add-iface').disabled  = !s;
}

function emptyHtml(icon, title, sub) {
    return `<div class="empty-state">${icon}<p>${esc(title)}</p><small>${esc(sub)}</small></div>`;
}

function iconServer() {
    return `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="2" y="3" width="20" height="6" rx="2"/><rect x="2" y="15" width="20" height="6" rx="2"/>
        <line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/>
    </svg>`;
}

function iconServerSm() {
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="2" y="3" width="20" height="6" rx="2"/><rect x="2" y="15" width="20" height="6" rx="2"/>
        <line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/>
    </svg>`;
}

function iconNet() {
    return `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/>
        <path d="M12 7v4M5 17l7-6 7 6"/>
    </svg>`;
}