/* ============================================================
   CONFIG
   ============================================================ */
const API = '/api';


/* ============================================================
   DATA
   - groups: full data from API, never modified
   - filtered: what is currently shown after search
   ============================================================ */
let groups   = [];
let filtered = [];


/* ============================================================
   LOAD
   - Fetches inventory from API
   - Each item is a group with servers inside
   ============================================================ */
async function loadInventory() {
    const root = document.getElementById('inv-root');
    root.innerHTML = `<p style="color:var(--color-text-muted); font-size:var(--text-xs);">Loading...</p>`;

    try {
        const res = await fetch(`${API}/inventory/`);
        if (!res.ok) throw new Error(`Server error: ${res.status}`);

        groups   = await res.json();
        filtered = groups;

        console.log(`[OK] Loaded ${groups.length} groups`);
        updateStats();
        render();

    } catch (error) {
        console.error('[ERROR] Could not load inventory:', error);
        root.innerHTML = `<p style="color:var(--color-text-muted);">Could not load inventory.</p>`;
        showToast('Could not load inventory');
    }
}


/* ============================================================
   RENDER
   - Builds one section per group
   - Each section has a title + table of servers/interfaces
   ============================================================ */
function render() {
    const root = document.getElementById('inv-root');

    if (!filtered.length) {
        root.innerHTML = `
            <div class="inv-empty">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                <p>No results match your search</p>
                <small>Try searching by hostname, IP address or VLAN name</small>
            </div>`;
        return;
    }

    root.innerHTML = filtered.map(group => buildGroup(group)).join('');
}


/* ============================================================
   BUILD GROUP
   - Returns HTML for one group section (title + table)
   ============================================================ */
function buildGroup(group) {

    // Count total interfaces across all servers in this group
    const totalIfaces = group.servers.reduce((sum, s) => sum + s.interfaces.length, 0);

    // Build all table rows for this group
    // Each server may have multiple interfaces — first interface shares the row
    // with the hostname, subsequent interfaces just show IP/VLAN/range
    const rows = group.servers.map(server => {

        if (!server.interfaces.length) {
            // Server has no interfaces at all
            return `
                <tr>
                    <td class="inv-hostname-cell">${esc(server.hostname)}</td>
                    <td colspan="3" style="color:var(--color-text-faint); font-size:var(--text-xs);">
                        No interfaces
                    </td>
                </tr>`;
        }

        // First interface shares the row with the hostname
        // Extra interfaces get their own rows with an empty hostname cell
        return server.interfaces.map((iface, index) => `
            <tr class="${index === 0 ? 'inv-first-row' : 'inv-extra-row'}">
                ${index === 0
                    ? `<td class="inv-hostname-cell" rowspan="${server.interfaces.length}">
                           ${esc(server.hostname)}
                       </td>`
                    : ''
                }
                <td><span class="ip-addr">${esc(iface.ip_address)}</span></td>
                <td><span class="vlan-pill">${esc(iface.vlan_name)}</span></td>
                <td><span class="inv-ip-range">${esc(iface.ip_range)}</span></td>
            </tr>`
        ).join('');

    }).join('');

    return `
        <div class="inv-section">

            <!-- Group header -->
            <div class="inv-section-head">
                <div class="inv-section-title">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <rect x="2" y="3" width="20" height="6" rx="2"/>
                        <rect x="2" y="15" width="20" height="6" rx="2"/>
                    </svg>
                    ${esc(group.group_name)}
                </div>
                <span class="inv-section-meta">
                    ${group.servers.length} server${group.servers.length !== 1 ? 's' : ''}
                    &middot;
                    ${totalIfaces} interface${totalIfaces !== 1 ? 's' : ''}
                </span>
            </div>

            <!-- Group table -->
            <div class="table-wrapper">
                <table class="details-table inv-table">
                    <thead>
                        <tr>
                            <th scope="col">Hostname</th>
                            <th scope="col">IP Address</th>
                            <th scope="col">VLAN</th>
                            <th scope="col">IP Range</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>
            </div>

        </div>`;
}


/* ============================================================
   SEARCH
   - Filters groups and servers by hostname, IP, or VLAN name
   - Preserves the group structure in results
   ============================================================ */
function handleSearch(query) {
    const q = query.toLowerCase().trim();

    if (!q) {
        // Empty query — show everything
        filtered = groups;
        updateStats();
        render();
        return;
    }

    // Filter each group's servers by the query
    filtered = groups
        .map(group => {
            const matchedServers = group.servers.filter(server => {

                // Match hostname
                if (server.hostname.toLowerCase().includes(q)) return true;

                // Match any IP address
                if (server.interfaces.some(i => i.ip_address.includes(q))) return true;

                // Match any VLAN name
                if (server.interfaces.some(i => i.vlan_name.toLowerCase().includes(q))) return true;

                // Match IP range
                if (server.interfaces.some(i => i.ip_range.includes(q))) return true;

                return false;
            });

            // Only keep the group if it has matching servers
            if (!matchedServers.length) return null;

            return { ...group, servers: matchedServers };
        })
        .filter(Boolean); // remove null groups

    updateStats();
    render();
}


/* ============================================================
   STATS
   - Shows summary counts in the toolbar
   ============================================================ */
function updateStats() {
    const totalServers = filtered.reduce((sum, g) => sum + g.servers.length, 0);
    const totalIfaces  = filtered.reduce((sum, g) =>
        sum + g.servers.reduce((s2, srv) => s2 + srv.interfaces.length, 0), 0);

    document.getElementById('inv-stats').textContent =
        `${filtered.length} group${filtered.length !== 1 ? 's' : ''} · ` +
        `${totalServers} server${totalServers !== 1 ? 's' : ''} · ` +
        `${totalIfaces} interface${totalIfaces !== 1 ? 's' : ''}`;
}


/* ============================================================
   EVENT LISTENERS
   ============================================================ */
document.getElementById('search-input').addEventListener('input', e => {
    handleSearch(e.target.value);
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
loadInventory();
