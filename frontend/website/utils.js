/* ============================================================
   UTILS — helpers used by all other files
   ============================================================ */

function esc(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

let _toastTimer;
function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
}

let _modalConfirmCb = null;

function openModal(title, fields, onConfirm) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = fields.map(f => `
        <div class="form-field">
            <label for="field-${f.id}">${esc(f.label)}</label>
            ${f.type === 'select'
                ? `<select id="field-${f.id}">
                     ${f.options.map(o => {
                         const val   = typeof o === 'object' ? o.value : o;
                         const label = typeof o === 'object' ? o.label : o;
                         return `<option value="${esc(val)}">${esc(label)}</option>`;
                     }).join('')}
                   </select>`
                : `<input id="field-${f.id}" type="${f.type || 'text'}" placeholder="${esc(f.placeholder || '')}" />`
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

function getFieldValues(fields) {
    const vals = {};
    fields.forEach(f => { vals[f.id] = document.getElementById('field-' + f.id)?.value.trim(); });
    return vals;
}