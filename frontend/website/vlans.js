/* ============================================================
   CONFIG
   ============================================================ */
const API = '/api';


/* ============================================================
   DATA
   - All VLANs stored here after loading from API
   ============================================================ */
let vlans = [];


/* ============================================================
   LOAD
   - Fetches all VLANs from API on page load
   ============================================================ */
async function loadVlans() {
    try {
        const res = await fetch(`${API}/vlans/`);
        if (!res.ok) throw new Error(`Server error: ${res.status}`);

        vlans = await res.json();
        console.log(`[OK] Loaded ${vlans.length} VLANs`);
        renderTable();

    } catch (error) {
        console.error('[ERROR] Could not load VLANs:', error);
        showToast('Could not load VLANs');
    }
}


/* ============================================================
   RENDER TABLE
   - Builds the table rows from the local vlans array
   - Called after every load, add, edit, or delete
   ============================================================ */
function renderTable() {
    const tbody = document.getElementById('vlan-tbody');

    if (!vlans.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center; padding:2rem; color:#888;">
                    No VLANs yet — click + Add VLAN
                </td>
            </tr>`;
        return;
    }

    tbody.innerHTML = vlans.map(v => `
        <tr>
            <td><strong>${esc(v.name)}</strong></td>
            <td><span class="ip-addr">${esc(v.ip_range)}</span></td>
            <td><span class="ip-addr">${esc(v.subnet_mask)}</span></td>
            <td>
                <span class="type-pill ${v.is_mgmt ? 'type-MGMT' : 'type-DEFAULT'}">
                    ${v.is_mgmt ? 'Management' : 'Standard'}
                </span>
            </td>
            <td style="text-align:right; white-space:nowrap; padding-right: 1rem;">
                <button class="btn btn-ghost"
                    style="padding:3px 10px; font-size:0.8rem; margin-right:4px;"
                    data-action="edit-vlan"
                    data-id="${v.id}">
                    Edit
                </button>
                <button class="btn btn-ghost"
                    style="padding:3px 10px; font-size:0.8rem; color:#e53e3e; border-color:#fed7d7;"
                    data-action="delete-vlan"
                    data-id="${v.id}">
                    Delete
                </button>
            </td>
        </tr>
    `).join('');
}


/* ============================================================
   ADD VLAN
   - Opens modal, sends POST /vlans, adds to local array
   ============================================================ */
function actionAddVlan() {
    const fields = [
        { id: 'name',        label: 'VLAN Name',   placeholder: 'e.g. MGMT_VLAN_10' },
        { id: 'ip_range',    label: 'IP Range',    placeholder: 'e.g. 10.10.10.0/24' },
        { id: 'subnet_mask', label: 'Subnet Mask', placeholder: 'e.g. 255.255.255.0' },
        {
            id: 'is_mgmt',
            label: 'Type',
            type: 'select',
            options: [
                { label: 'Standard',   value: 0 },
                { label: 'Management', value: 1 }
            ]
        }
    ];

    openModal('Add VLAN', fields, async () => {
        const v = getFieldValues(fields);

        // Basic validation
        if (!v.name)        return showToast('VLAN name is required');
        if (!v.ip_range)    return showToast('IP range is required');
        if (!v.subnet_mask) return showToast('Subnet mask is required');

        try {
            const res = await fetch(`${API}/vlans`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name:        v.name,
                    ip_range:    v.ip_range,
                    subnet_mask: v.subnet_mask,
                    is_mgmt:     Number(v.is_mgmt)  // convert "0"/"1" string to number
                })
            });

            if (!res.ok) {
                const err = await res.json();
                return showToast(err.detail);
            }

            const newVlan = await res.json();  // { id, name, ip_range, subnet_mask, is_mgmt }
            vlans.push(newVlan);               // add to local array
            closeModal();
            renderTable();
            showToast(`VLAN "${newVlan.name}" created`);

        } catch (error) {
            console.error('[ERROR] Could not add VLAN:', error);
            showToast('Could not connect to API');
        }
    });
}


/* ============================================================
   EDIT VLAN
   - Opens modal pre-filled with current values
   - Sends PUT /vlans/{id}, updates local array
   ============================================================ */
function actionEditVlan(vlanId) {
    const vlan = vlans.find(v => v.id === vlanId);
    if (!vlan) return;

    const fields = [
        { id: 'name',        label: 'VLAN Name',   placeholder: vlan.name },
        { id: 'ip_range',    label: 'IP Range',    placeholder: vlan.ip_range },
        { id: 'subnet_mask', label: 'Subnet Mask', placeholder: vlan.subnet_mask },
        {
            id: 'is_mgmt',
            label: 'Type',
            type: 'select',
            options: [
                { label: 'Standard',   value: 0 },
                { label: 'Management', value: 1 }
            ]
        }
    ];

    openModal(`Edit "${vlan.name}"`, fields, async () => {
        const v = getFieldValues(fields);

        if (!v.name)        return showToast('VLAN name is required');
        if (!v.ip_range)    return showToast('IP range is required');
        if (!v.subnet_mask) return showToast('Subnet mask is required');

        try {
            const res = await fetch(`${API}/vlans/${vlanId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name:        v.name,
                    ip_range:    v.ip_range,
                    subnet_mask: v.subnet_mask,
                    is_mgmt:     Number(v.is_mgmt)
                })
            });

            if (!res.ok) {
                const err = await res.json();
                return showToast(err.detail);
            }

            // Update the local array in place
            Object.assign(vlan, {
                name:        v.name,
                ip_range:    v.ip_range,
                subnet_mask: v.subnet_mask,
                is_mgmt:     Number(v.is_mgmt)
            });

            closeModal();
            renderTable();
            showToast(`VLAN "${v.name}" updated`);

        } catch (error) {
            console.error('[ERROR] Could not update VLAN:', error);
            showToast('Could not connect to API');
        }
    });

    // Pre-fill inputs with current values after modal opens
    document.getElementById('field-name').value        = vlan.name;
    document.getElementById('field-ip_range').value    = vlan.ip_range;
    document.getElementById('field-subnet_mask').value = vlan.subnet_mask;
    document.getElementById('field-is_mgmt').value     = vlan.is_mgmt;
}


/* ============================================================
   DELETE VLAN
   - Confirms with user, sends DELETE /vlans/{id}
   - Removes from local array
   ============================================================ */
async function actionDeleteVlan(vlanId) {
    const vlan = vlans.find(v => v.id === vlanId);
    if (!vlan) return;

    if (!confirm(`Delete VLAN "${vlan.name}"?\n\nThis will also remove it from any server that uses it.`)) return;

    try {
        const res = await fetch(`${API}/vlans/${vlanId}`, { method: 'DELETE' });

        if (!res.ok) {
            const err = await res.json();
            return showToast(err.detail);
        }

        vlans = vlans.filter(v => v.id !== vlanId);  // remove from local array
        renderTable();
        showToast(`VLAN "${vlan.name}" deleted`);

    } catch (error) {
        console.error('[ERROR] Could not delete VLAN:', error);
        showToast('Could not connect to API');
    }
}


/* ============================================================
   EVENT LISTENERS
   ============================================================ */
document.addEventListener('click', e => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const action = el.dataset.action;
    const id     = Number(el.dataset.id);

    switch (action) {
        case 'edit-vlan':   actionEditVlan(id);   break;
        case 'delete-vlan': actionDeleteVlan(id); break;
    }
});

document.getElementById('btn-add-vlan').addEventListener('click',  actionAddVlan);
document.getElementById('modal-close').addEventListener('click',   closeModal);
document.getElementById('modal-cancel').addEventListener('click',  closeModal);
document.getElementById('modal-confirm').addEventListener('click', () => {
    if (_modalConfirmCb) _modalConfirmCb();
});

// Click outside modal to close
document.getElementById('modal').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal();
});

// Escape key closes modal
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
});


/* ============================================================
   MODAL HELPERS
   - Same pattern as script.js
   ============================================================ */
let _modalConfirmCb = null;

function openModal(title, fields, onConfirm) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = fields.map(f => `
        <div class="form-field">
            <label for="field-${f.id}">${esc(f.label)}</label>
            ${f.type === 'select'
                ? `<select id="field-${f.id}">
                     ${f.options.map(o => `<option value="${o.value}">${esc(o.label)}</option>`).join('')}
                   </select>`
                : `<input id="field-${f.id}" type="text" placeholder="${esc(f.placeholder || '')}" />`
            }
        </div>`).join('');
    _modalConfirmCb = onConfirm;
    document.getElementById('modal').classList.add('open');
    document.getElementById('modal-body').querySelector('input, select')?.focus();
}

function closeModal() {
    document.getElementById('modal').classList.remove('open');
    _modalConfirmCb = null;
}

// Read all field values from the open modal
function getFieldValues(fields) {
    const vals = {};
    fields.forEach(f => {
        vals[f.id] = document.getElementById('field-' + f.id)?.value.trim();
    });
    return vals;
}


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
   - Always escape data before inserting into HTML
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
loadVlans();
