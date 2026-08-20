/* ============================================================
   ACTIONS — what happens when the user clicks things
   ============================================================ */

async function actionAddGroup() {
    const fields = [
        { id: 'name',        label: 'Group Name',  placeholder: 'e.g. Monitoring Stack' },
        { id: 'description', label: 'Description', placeholder: 'Optional' }
    ];
    openModal('Add Group', fields, async () => {
        const v = getFieldValues(fields);
        if (!v.name) return showToast('Group name is required');
        try {
            const res = await fetch(`${API}/group`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: v.name, description: v.description || null })
            });
            if (!res.ok) { const e = await res.json(); return showToast(e.detail); }
            closeModal();
            await loadGroups();  // reload from API — gets real ID and fresh data
            showToast(`Group "${v.name}" created`);
        } catch { showToast('Could not connect to API'); }
    });
}

async function actionEditGroup(groupId) {
    const group = DB.groups.find(g => g.id === groupId);
    if (!group) return;
    const fields = [
        { id: 'name',        label: 'Group Name',  placeholder: group.name },
        { id: 'description', label: 'Description', placeholder: group.description || '' }
    ];
    openModal(`Edit "${group.name}"`, fields, async () => {
        const v = getFieldValues(fields);
        if (!v.name) return showToast('Group name is required');
        try {
            const res = await fetch(`${API}/groups/${groupId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: v.name, description: v.description })
            });
            if (!res.ok) { const e = await res.json(); return showToast(e.detail); }
            closeModal();
            await loadGroups();  // reload so group list updates immediately
            showToast(`Group renamed to "${v.name}"`);
        } catch { showToast('Could not connect to API'); }
    });
    document.getElementById('field-name').value        = group.name;
    document.getElementById('field-description').value = group.description || '';
}

async function actionDeleteGroup(groupId) {
    const group = DB.groups.find(g => g.id === groupId);
    if (!group) return;
    if (!confirm(`Delete "${group.name}" and ALL its servers?`)) return;
    try {
        const res = await fetch(`${API}/groups/${groupId}`, { method: 'DELETE' });
        if (!res.ok) { const e = await res.json(); throw new Error(e.detail); }
        // Reset selection first, then reload
        setState({ groupId: null, serverId: null });
        await loadGroups();
        showToast(`Group "${group.name}" deleted`);
    } catch (err) { showToast(`Error: ${err.message}`); }
}

async function actionAddServer() {
    const g = getGroup();
    if (!g) return;
    const fields = [{ id: 'hostname', label: 'Hostname', placeholder: 'e.g. web-server-01' }];
    openModal(`Add Server to "${g.name}"`, fields, async () => {
        const v = getFieldValues(fields);
        if (!v.hostname) return showToast('Hostname is required');
        try {
            const res = await fetch(`${API}/servers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ hostname: v.hostname, group_id: g.id })
            });
            if (!res.ok) { const e = await res.json(); return showToast(e.detail); }
            const newServer = await res.json();
            closeModal();
            await loadServers(g.id);              // reload servers from API
            setState({ serverId: newServer.id }); // select the new server
            showToast(`Server "${newServer.hostname}" added`);
        } catch { showToast('Could not connect to API'); }
    });
}

async function actionEditServer() {
    const s = getServer();
    const g = getGroup();
    if (!s) return;
    const fields = [{ id: 'hostname', label: 'Hostname', placeholder: s.hostname }];
    openModal(`Edit Server`, fields, async () => {
        const v = getFieldValues(fields);
        if (!v.hostname) return closeModal();
        try {
            const res = await fetch(`${API}/servers/${s.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ hostname: v.hostname })
            });
            if (!res.ok) { const e = await res.json(); return showToast(e.detail); }
            closeModal();
            await loadServers(g.id);  // reload so new hostname shows in list
            showToast(`Renamed to "${v.hostname}"`);
        } catch { showToast('Could not connect to API'); }
    });
    document.getElementById('field-hostname').value = s.hostname;
}

async function actionDeleteServer() {
    const s = getServer(), g = getGroup();
    if (!s || !g) return;
    if (!confirm(`Delete "${s.hostname}" and all its interfaces?`)) return;
    try {
        const res = await fetch(`${API}/servers/${s.id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete');
        setState({ serverId: null });     // clear selection first
        await loadServers(g.id);          // reload server list from API
        showToast(`Server "${s.hostname}" deleted`);
    } catch { showToast('Could not delete server'); }
}

async function actionAddIface() {
    const s = getServer();
    if (!s) return;
    let vlans = [];
    try {
        vlans = await fetchVlans();
    } catch { return showToast('Could not load VLANs'); }

    const fields = [
        { id: 'ip', label: 'IP Address', placeholder: '10.0.0.1' },
        {
            id: 'vlan_id', label: 'VLAN', type: 'select',
            options: vlans.map(v => ({ label: `${v.name} — ${v.ip_range}`, value: v.id }))
        }
    ];
    openModal(`Add Interface to "${s.hostname}"`, fields, async () => {
        const v = getFieldValues(fields);
        if (!v.ip)      return showToast('IP address is required');
        if (!v.vlan_id) return showToast('VLAN is required');
        try {
            const res = await fetch(`${API}/servers/${s.id}/interfaces`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ip_address: v.ip, vlan_id: Number(v.vlan_id) })
            });
            if (!res.ok) { const e = await res.json(); return showToast(e.detail); }
            closeModal();
            await loadInterfaces(s.id);  // reload interfaces from API
            showToast(`Interface ${v.ip} added`);
        } catch { showToast('Could not connect to API'); }
    });
}

async function actionDeleteIface(ifaceId) {
    const s = getServer();
    if (!s) return;
    const iface = s.networking.find(n => n.id === ifaceId);
    const ipStr = iface ? iface.ip : 'this interface';
    if (!confirm(`Remove ${ipStr}?`)) return;
    try {
        const res = await fetch(`${API}/servers/${s.id}/interfaces/${ifaceId}`, { method: 'DELETE' });
        if (!res.ok) { const e = await res.json(); throw new Error(e.detail); }
        await loadInterfaces(s.id);  // reload interfaces from API
        showToast(`Interface ${ipStr} removed`);
    } catch (err) { showToast(`Error: ${err.message}`); }
}