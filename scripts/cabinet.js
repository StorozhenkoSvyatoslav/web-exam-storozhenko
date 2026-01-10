'use strict';

// Глобальные переменные
let ordersData = [];
let currentOrderPage = 1;
let selectedOrderId = null;
const ITEMS_PER_PAGE = (window.Utils && window.Utils.ITEMS_PER_PAGE) ? window.Utils.ITEMS_PER_PAGE : 5;

const notify = (window.Utils && typeof window.Utils.showNotification === 'function') ? window.Utils.showNotification : function(msg, type='info'){ console.log(type.toUpperCase(), msg); };
const fmtDate = (window.Utils && typeof window.Utils.formatDate === 'function') ? window.Utils.formatDate : (s=>s);
const paginate = (window.Utils && typeof window.Utils.paginateArray === 'function') ? window.Utils.paginateArray : (arr, page, per=ITEMS_PER_PAGE)=>{ if(!Array.isArray(arr)) return []; page = Number(page)||1; per = Number(per)||ITEMS_PER_PAGE; const start=(page-1)*per; return arr.slice(start, start+per); };
const createPaginationHtml = (window.Utils && typeof window.Utils.createPagination === 'function') ? window.Utils.createPagination : (c,t,cb)=>{ let html=''; if(t<=1) return html; html+='<div class="pagination">'; if(c>1) html+=`<button class="page-link" data-page="${c-1}">Previous</button>`; for(let i=1;i<=t;i++){ const active=i===c? 'active':''; html+=`<button class="page-link ${active}" data-page="${i}">${i}</button>`; } if(c<t) html+=`<button class="page-link" data-page="${c+1}">Next</button>`; html+='</div>'; return html; };

// API endpoints
const API_ENDPOINTS = window.API_ENDPOINTS || {
  orders: (window.API_CONFIG && window.API_CONFIG.baseUrl ? window.API_CONFIG.baseUrl : '') + '/api/orders',
  updateOrder: id => ((window.API_CONFIG && window.API_CONFIG.baseUrl ? window.API_CONFIG.baseUrl : '') + `/api/orders/${id}`),
  deleteOrder: id => ((window.API_CONFIG && window.API_CONFIG.baseUrl ? window.API_CONFIG.baseUrl : '') + `/api/orders/${id}`)
};

// --- Load orders ---
async function loadOrders() {
  try {
    const resp = await fetch(API_ENDPOINTS.orders);
    if (!resp.ok) throw new Error('Network response not ok');
    const json = await resp.json();
    ordersData = Array.isArray(json) ? json : (json.data || []);

    if (!ordersData.length) {
      if (window.Utils && typeof window.Utils.showEmptyState === 'function') {
        window.Utils.showEmptyState('ordersTableContainer', 'emptyOrdersMessage');
      }
      displayOrders(1); // ensure pagination cleared
      return;
    }

    displayOrders(1);
  } catch (err) {
    console.error('Error loading orders', err);
    notify('Ошибка загрузки заявок', 'error');
    ordersData = [];
    // show empty
    if (window.Utils && typeof window.Utils.showEmptyState === 'function') {
      window.Utils.showEmptyState('ordersTableContainer', 'emptyOrdersMessage');
    }
    displayOrders(1);
  }
}

// --- Display orders ---
function displayOrders(page = 1) {
  currentOrderPage = Number(page) || 1;
  const tbody = document.getElementById('ordersBody');
  const containerId = 'ordersTableContainer';
  const emptyId = 'emptyOrdersMessage';
  if (!tbody) return;

  const totalPages = Math.max(1, Math.ceil(ordersData.length / ITEMS_PER_PAGE));
  if (currentOrderPage > totalPages) currentOrderPage = totalPages;
  const pageItems = paginate(ordersData, currentOrderPage, ITEMS_PER_PAGE);

  tbody.innerHTML = '';

  if (!pageItems.length) {
    if (window.Utils && typeof window.Utils.showEmptyState === 'function') {
      window.Utils.showEmptyState(containerId, emptyId);
    } else {
      const container = document.getElementById(containerId);
      const empty = document.getElementById(emptyId);
      if (container) container.style.display = 'none';
      if (empty) { empty.classList.remove('hidden'); empty.style.display = ''; }
    }
    const pagEl = document.getElementById('ordersPagination'); if (pagEl) pagEl.innerHTML = '';
    return;
  }

  if (window.Utils && typeof window.Utils.showTableState === 'function') {
    window.Utils.showTableState(containerId, emptyId);
  } else {
    const container = document.getElementById(containerId);
    const empty = document.getElementById(emptyId);
    if (container) container.style.display = '';
    if (empty) empty.classList.add('hidden');
  }

  pageItems.forEach((order, idx) => {
    const tr = document.createElement('tr');
    const numberTd = document.createElement('td'); numberTd.textContent = String((currentOrderPage-1)*ITEMS_PER_PAGE + idx + 1);

    const subjectTd = document.createElement('td');
    if (order.course_id && order.course_name) {
      subjectTd.textContent = `Курс: ${order.course_name}`;
    } else if (order.tutor_id && order.tutor_name) {
      subjectTd.textContent = `Репетитор: ${order.tutor_name}`;
    } else {
      subjectTd.textContent = '-';
    }

    const dateTd = document.createElement('td'); dateTd.textContent = fmtDate(order.date_start || '');
    const timeTd = document.createElement('td'); timeTd.textContent = (order.time_start != null) ? order.time_start : '-';
    const durationTd = document.createElement('td');
    if (order.duration_hours) durationTd.textContent = `${order.duration_hours} ч`;
    else if (order.duration_weeks) durationTd.textContent = `${order.duration_weeks} нед`;
    else durationTd.textContent = '-';
    const priceTd = document.createElement('td'); priceTd.textContent = order.price != null ? String(order.price) : '-';

    const actionsTd = document.createElement('td');
    const actionsWrap = document.createElement('div'); actionsWrap.className = 'table-actions';

    const detailsBtn = document.createElement('button');
    detailsBtn.className = 'btn btn-sm btn-info';
    detailsBtn.type = 'button';
    detailsBtn.textContent = 'Подробнее';
    detailsBtn.setAttribute('data-id', order.id != null ? order.id : '');
    detailsBtn.addEventListener('click', () => openDetailsModal(order.id));

    const editBtn = document.createElement('button');
    editBtn.className = 'btn btn-sm btn-warning';
    editBtn.type = 'button';
    editBtn.textContent = 'Редактировать';
    editBtn.setAttribute('data-id', order.id != null ? order.id : '');
    editBtn.addEventListener('click', () => openEditModal(order.id));

    const delBtn = document.createElement('button');
    delBtn.className = 'btn btn-sm btn-danger';
    delBtn.type = 'button';
    delBtn.textContent = 'Удалить';
    delBtn.setAttribute('data-id', order.id != null ? order.id : '');
    delBtn.addEventListener('click', () => openDeleteConfirmModal(order.id));

    actionsWrap.appendChild(detailsBtn);
    actionsWrap.appendChild(editBtn);
    actionsWrap.appendChild(delBtn);
    actionsTd.appendChild(actionsWrap);

    tr.appendChild(numberTd);
    tr.appendChild(subjectTd);
    tr.appendChild(dateTd);
    tr.appendChild(timeTd);
    tr.appendChild(durationTd);
    tr.appendChild(priceTd);
    tr.appendChild(actionsTd);

    tbody.appendChild(tr);
  });

  // Пагинация
  const pagEl = document.getElementById('ordersPagination');
  if (pagEl) {
    const html = createPaginationHtml(currentOrderPage, Math.max(1, Math.ceil(ordersData.length / ITEMS_PER_PAGE)), function(p){
      currentOrderPage = p;
      displayOrders(p);
    });
    pagEl.innerHTML = html;

    // Fallback: add event listeners for data-page buttons
    pagEl.querySelectorAll && pagEl.querySelectorAll('.page-link').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const p = Number(btn.getAttribute('data-page')) || 1;
        currentOrderPage = p;
        displayOrders(p);
      });
    });
  }
}

// --- Details modal ---
function openDetailsModal(orderId) {
  const order = ordersData.find(o => String(o.id) === String(orderId));
  if (!order) return;
  const modal = document.getElementById('detailsModal');
  const body = document.getElementById('detailsModalBody');
  if (!modal || !body) return;

  let html = '';
  if (order.course_id) html += `<p><strong>Курс:</strong> ${order.course_name || order.course_id}</p>`;
  if (order.tutor_id) html += `<p><strong>Репетитор:</strong> ${order.tutor_name || order.tutor_id}</p>`;
  html += `<p><strong>Дата начала:</strong> ${fmtDate(order.date_start || '')}</p>`;
  html += `<p><strong>Время:</strong> ${order.time_start || '-'}</p>`;
  if (order.duration_hours) html += `<p><strong>Продолжительность:</strong> ${order.duration_hours} ч</p>`;
  if (order.duration_weeks) html += `<p><strong>Продолжительность:</strong> ${order.duration_weeks} нед</p>`;
  html += `<p><strong>Студентов:</strong> ${order.persons != null ? order.persons : '-'}</p>`;
  html += `<p><strong>Стоимость:</strong> ${order.price != null ? order.price : '-'}</p>`;
  if (order.early_registration) html += `<p><em>Скидка ранней регистрации</em></p>`;

  body.innerHTML = html;
  if (window.Utils && typeof window.Utils.openModal === 'function') window.Utils.openModal('detailsModal');
  else openModal('detailsModal');
}

// --- Edit modal ---
function openEditModal(orderId) {
  const order = ordersData.find(o => String(o.id) === String(orderId));
  if (!order) return;
  selectedOrderId = orderId;
  const editForm = document.getElementById('editForm');
  if (!editForm) return;

  const editDate = document.getElementById('editDate');
  const editTime = document.getElementById('editTime');
  const editPersons = document.getElementById('editPersons');

  if (editDate) editDate.value = order.date_start || '';
  if (editTime) editTime.value = order.time_start || '';
  if (editPersons) editPersons.value = order.persons != null ? String(order.persons) : '';

  if (window.Utils && typeof window.Utils.openModal === 'function') window.Utils.openModal('editModal');
  else openModal('editModal');
}

// --- Save order (PUT) ---
async function saveOrder() {
  const editForm = document.getElementById('editForm');
  if (!editForm) return;
  const editDate = document.getElementById('editDate');
  const editTime = document.getElementById('editTime');
  const editPersons = document.getElementById('editPersons');

  const payload = {
    date_start: editDate ? editDate.value : undefined,
    time_start: editTime ? editTime.value : undefined,
    persons: editPersons ? Number(editPersons.value) : undefined
  };

  if (!selectedOrderId) {
    notify('Ошибка: не выбрана заявка', 'error');
    return;
  }

  try {
    const resp = await fetch(API_ENDPOINTS.updateOrder(selectedOrderId), {
      method: 'PUT',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });
    if (!resp.ok) throw new Error('Network response not ok');
    // Optionally update local data if API returns updated object
    // Reload list
    notify('Заявка обновлена', 'success');
    if (window.Utils && typeof window.Utils.closeModal === 'function') window.Utils.closeModal('editModal');
    else closeModal('editModal');
    await loadOrders();
  } catch (err) {
    console.error('Error saving order', err);
    notify('Ошибка сохранения', 'error');
  }
}

// --- Delete flow ---
function openDeleteConfirmModal(orderId) {
  selectedOrderId = orderId;
  if (window.Utils && typeof window.Utils.openModal === 'function') window.Utils.openModal('deleteConfirmModal');
  else openModal('deleteConfirmModal');
}

async function confirmDelete() {
  if (!selectedOrderId) {
    notify('Ошибка: не выбрана заявка', 'error');
    return;
  }
  try {
    const resp = await fetch(API_ENDPOINTS.deleteOrder(selectedOrderId), { method: 'DELETE' });
    if (!resp.ok) throw new Error('Network response not ok');
    notify('Заявка удалена', 'success');
    if (window.Utils && typeof window.Utils.closeModal === 'function') window.Utils.closeModal('deleteConfirmModal');
    else closeModal('deleteConfirmModal');
    await loadOrders();
  } catch (err) {
    console.error('Error deleting order', err);
    notify('Ошибка удаления', 'error');
  }
}

// --- Event delegation for details/edit/delete buttons inside orders table ---
function setupOrdersDelegation() {
  document.addEventListener('click', function(e){
    const target = e.target;
    if (!target) return;
    if (target.matches && target.matches('[data-action="order-details"]')) {
      const id = target.getAttribute('data-id');
      openDetailsModal(id);
      return;
    }
    if (target.matches && target.matches('[data-action="order-edit"]')) {
      const id = target.getAttribute('data-id');
      openEditModal(id);
      return;
    }
    if (target.matches && target.matches('[data-action="order-delete"]')) {
      const id = target.getAttribute('data-id');
      openDeleteConfirmModal(id);
      return;
    }
    // Pagination fallback
    if (target.matches && target.matches('.page-link') && target.dataset && target.dataset.page) {
      const p = Number(target.dataset.page) || 1;
      currentOrderPage = p;
      displayOrders(p);
      return;
    }
  });
}

// --- Init ---
document.addEventListener('DOMContentLoaded', function(){
  setupOrdersDelegation();
  // Bind save/confirm buttons if present
  const saveBtn = document.getElementById('saveOrderBtn');
  if (saveBtn) saveBtn.addEventListener('click', saveOrder);
  const confirmDelBtn = document.getElementById('confirmDeleteBtn');
  if (confirmDelBtn) confirmDelBtn.addEventListener('click', confirmDelete);

  loadOrders();
});

// Expose some functions for inline uses (if templates use onclick attributes)
window.Cabinet = {
  openDetailsModal,
  openEditModal,
  openDeleteConfirmModal,
  saveOrder,
  confirmDelete,
  loadOrders
};
