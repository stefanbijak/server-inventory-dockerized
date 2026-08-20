/* ============================================================
   STATE — data and current selection
   ============================================================ */
const API = '/api';

let DB = { groups: [] };

const state = { groupId: null, serverId: null };

function setState(patch) {
    Object.assign(state, patch);
    render();
}

const getGroup  = () => (DB.groups || []).find(g => g.id === state.groupId) || null;
const getServer = () => { const g = getGroup(); return g ? (g.servers || []).find(s => s.id === state.serverId) || null : null; };
