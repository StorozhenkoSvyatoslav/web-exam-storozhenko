'use strict';

// UI utils for the app
const ITEMS_PER_PAGE = 10;
let _notificationTimeoutId = null;
window.__paginationCallbacks = window.__paginationCallbacks || {};

function showNotification(message, type = 'info') {
  const el = document.getElementById('notification');
  if (!el) return;

  // Remove previous type classes
  el.classList.remove('success', 'error', 'warning', 'info');
  // Map types to classes
  const allowed = ['success', 'error', 'warning', 'info'];
  const t = allowed.includes(type) ? type : 'info';
  el.classList.add(t);

  el.textContent = message;
  el.classList.remove('hidden');

  // Clear previous timeout if exists
  if (_notificationTimeoutId) {
    clearTimeout(_notificationTimeoutId);
    _notificationTimeoutId = null;
  }

  _notificationTimeoutId = setTimeout(() => {
    el.classList.add('hidden');
    _notificationTimeoutId = null;
  }, 5000);
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.add('hidden');

  // Try to clear form with id 'editForm' if exists inside modal or globally
  const formInside = modal.querySelector('#editForm');
  const formGlobal = document.getElementById('editForm');
  const form = formInside || (formGlobal && formGlobal.closest(`#${modalId}`) ? formGlobal : formInside || formGlobal);
  if (form && typeof form.reset === 'function') {
    form.reset();
  }
}

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.remove('hidden');
}

function showEmptyState(containerId, emptyMessageId) {
  const container = document.getElementById(containerId);
  const empty = document.getElementById(emptyMessageId);
  if (container) {
    container.style.display = 'none';
  }
  if (empty) {
    empty.classList.remove('hidden');
    // ensure visible if previously hidden via display
    empty.style.display = '';
  }
}

function showTableState(containerId, emptyMessageId) {
  const container = document.getElementById(containerId);
  const empty = document.getElementById(emptyMessageId);
  if (container) {
    container.style.display = ''; // let CSS decide (block/table)
  }
  if (empty) {
    empty.classList.add('hidden');
  }
}

function formatDate(dateString) {
  if (typeof dateString !== 'string') return dateString;
  // Expect YYYY-MM-DD
  const m = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return dateString;
  const [, year, month, day] = m;
  return `${day}.${month}.${year}`;
}

function formatTime(timeString) {
  if (typeof timeString !== 'string') return timeString;
  // Expect HH:MM (or H:MM) - normalize to HH:MM
  const m = timeString.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return timeString;
  let [ , hh, mm ] = m;
  if (hh.length === 1) hh = '0' + hh;
  return `${hh}:${mm}`;
}

function logout() {
  try {
    localStorage.clear();
  } catch (e) {
    // ignore
  }
  window.location.href = 'main.html';
}

function createPagination(currentPage, totalPages, onPageClick) {
  currentPage = Number(currentPage) || 1;
  totalPages = Number(totalPages) || 1;

  // Register callback and expose via window with unique id so we can use inline onclick safely
  const cbId = `cb_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  window.__paginationCallbacks[cbId] = function (page) {
    if (typeof onPageClick === 'function') {
      onPageClick(page);
    }
  };

  let html = '<div class="pagination" role="navigation" aria-label="Pagination">';

  // Previous
  if (currentPage > 1) {
    html += `<button type="button" class="page-item"><button type=\"button\" class=\"page-link\" onclick=\"window.__paginationCallbacks['${cbId}'](${currentPage - 1})\">Previous</button></button>`;
  } else {
    html += `<button type="button" class="page-item" aria-disabled="true"><button type=\"button\" class=\"page-link\" disabled>Previous</button></button>`;
  }

  // Page numbers (simple all pages rendering)
  for (let i = 1; i <= totalPages; i++) {
    const active = i === currentPage ? 'active' : '';
    html += `<button type="button" class="page-item ${active}"><button type=\"button\" class=\"page-link\" onclick=\"window.__paginationCallbacks['${cbId}'](${i})\">${i}</button></button>`;
  }

  // Next
  if (currentPage < totalPages) {
    html += `<button type="button" class="page-item"><button type=\"button\" class=\"page-link\" onclick=\"window.__paginationCallbacks['${cbId}'](${currentPage + 1})\">Next</button></button>`;
  } else {
    html += `<button type="button" class="page-item" aria-disabled="true"><button type=\"button\" class=\"page-link\" disabled>Next</button></button>`;
  }

  html += '</div>';
  return html;
}

function paginateArray(array, page, itemsPerPage = ITEMS_PER_PAGE) {
  if (!Array.isArray(array)) return [];
  page = Number(page) || 1;
  itemsPerPage = Number(itemsPerPage) || ITEMS_PER_PAGE;
  const start = (page - 1) * itemsPerPage;
  return array.slice(start, start + itemsPerPage);
}

// Expose utilities globally
window.Utils = {
  ITEMS_PER_PAGE,
  showNotification,
  closeModal,
  openModal,
  showEmptyState,
  showTableState,
  formatDate,
  formatTime,
  logout,
  createPagination,
  paginateArray
};
