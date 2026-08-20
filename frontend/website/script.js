/* ============================================================
   SCRIPT.JS — entry point
   Wires events and boots the app
   All logic lives in: api.js, state.js, render.js, actions.js, utils.js
   ============================================================ */

document.addEventListener('click', e => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const action = el.dataset.action;
    const id     = Number(el.dataset.id);

    switch (action) {
        case 'select-group':  setState({ groupId: id, serverId: null }); loadServers(id); break;
        case 'select-server': setState({ serverId: id }); loadInterfaces(id); break;
        case 'crumb-group':   setState({ serverId: null }); break;
        case 'edit-group':    actionEditGroup(id);   break;
        case 'delete-group':  actionDeleteGroup(id); break;
        case 'edit-server':   actionEditServer();    break;
        case 'delete-server': actionDeleteServer();  break;
        case 'delete-iface':  actionDeleteIface(id); break;
    }
});

document.addEventListener('keydown', e => {
    const el = e.target.closest('[data-action]');
    if (el && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); el.click(); }
    if (e.key === 'Escape') closeModal();
});

document.getElementById('btn-add-group').addEventListener('click',  actionAddGroup);
document.getElementById('btn-add-server').addEventListener('click', actionAddServer);
document.getElementById('btn-add-iface').addEventListener('click',  actionAddIface);
document.getElementById('modal-close').addEventListener('click',    closeModal);
document.getElementById('modal-cancel').addEventListener('click',   closeModal);
document.getElementById('modal-confirm').addEventListener('click',  () => { if (_modalConfirmCb) _modalConfirmCb(); });
document.getElementById('modal').addEventListener('click', e => { if (e.target === e.currentTarget) closeModal(); });

// Boot
loadGroups();