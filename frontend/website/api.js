/* ============================================================
   API — all communication with FastAPI
   ============================================================ */

async function loadGroups() {
    try {
        const res = await fetch(`${API}/groups`);
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        const data = await res.json();
        DB.groups = data.map(g => ({ ...g, servers: g.servers || [] }));
        console.log(`[OK] Loaded ${DB.groups.length} groups`);
        render();
    } catch (err) {
        console.error('[ERROR] Could not load groups:', err);
    }
}

async function loadServers(groupId) {
    const group = DB.groups.find(g => g.id === groupId);
    if (!group) return;
    try {
        const res = await fetch(`${API}/groups/${groupId}/servers`);
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        group.servers = await res.json();
        console.log(`[OK] Loaded ${group.servers.length} servers for "${group.name}"`);
        render();
    } catch (err) {
        console.error('[ERROR] Could not load servers:', err);
    }
}

async function loadInterfaces(serverId) {
    const group  = getGroup();
    const server = (group?.servers || []).find(s => s.id === serverId);
    if (!server) return;
    try {
        const res = await fetch(`${API}/servers/${serverId}/interfaces`);
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        server.networking = await res.json();
        console.log(`[OK] Loaded ${server.networking.length} interfaces for "${server.hostname}"`);
        render();
    } catch (err) {
        console.error('[ERROR] Could not load interfaces:', err);
    }
}

async function fetchVlans() {
    const res = await fetch(`${API}/vlans/`);
    if (!res.ok) throw new Error('Could not load VLANs');
    return res.json();
}

setInterval(async () => {
    await loadGroups();
    if (state.groupId)  await loadServers(state.groupId);
    if (state.serverId) loadInterfaces(state.serverId);
}, 60000);