'use strict';

// Глобальные переменные
let coursesData = [];
let tutorsData = [];
let selectedTutorId = null;
let selectedCourseId = null;
let currentCoursePage = 1;
let currentTutorPage = 1;

const ITEMS_PER_PAGE_LOCAL = (window.API_CONFIG && window.API_CONFIG.ITEMS_PER_PAGE) ? window.API_CONFIG.ITEMS_PER_PAGE : 5; // максимальное количество записей на странице

// Безопасные ссылки на утилиты, если они подключены
const notify = (window.Utils && typeof window.Utils.showNotification === 'function') ? window.Utils.showNotification : function(msg, type='info') { console.log(type.toUpperCase(), msg); };
const paginate = (window.Utils && typeof window.Utils.paginateArray === 'function') ? window.Utils.paginateArray : function(arr, page, perPage = ITEMS_PER_PAGE_LOCAL){ if(!Array.isArray(arr)) return []; page = Number(page)||1; perPage = Number(perPage)||ITEMS_PER_PAGE_LOCAL; const start = (page-1)*perPage; return arr.slice(start, start+perPage); };
const createPaginationHtml = (window.Utils && typeof window.Utils.createPagination === 'function') ? window.Utils.createPagination : function(current, total, cb){
  let html = '';
  if (total <= 1) return html;
  html += '<div class="pagination">';
  if (current > 1) html += `<button class="page-link" data-page="${current-1}">Previous</button>`;
  for (let i=1;i<=total;i++){
    const active = i===current ? 'active' : '';
    html += `<button class="page-link ${active}" data-page="${i}">${i}</button>`;
  }
  if (current < total) html += `<button class="page-link" data-page="${current+1}">Next</button>`;
  html += '</div>';
  return html;
};

// Определение API_ENDPOINTS: используем window.API_CONFIG если доступен, иначе дефолтный внешний API с api_key
const DEFAULT_API_BASE = 'http://exam-api-courses.std-900.ist.mospolytech.ru/api';
const DEFAULT_API_KEY = 'f11c2bed-fc0e-4034-b539-dba80b6521da';
const API_ENDPOINTS = (window.API_CONFIG && window.API_CONFIG.API_ENDPOINTS) ? window.API_CONFIG.API_ENDPOINTS : (function(){
  const base = (window.API_CONFIG && window.API_CONFIG.API_BASE) ? window.API_CONFIG.API_BASE : DEFAULT_API_BASE;
  const key = (window.API_CONFIG && window.API_CONFIG.API_KEY) ? window.API_CONFIG.API_KEY : DEFAULT_API_KEY;
  return {
    courses: base + '/courses?api_key=' + key,
    tutors: base + '/tutors?api_key=' + key,
    orders: base + '/orders?api_key=' + key,
    createOrder: base + '/orders?api_key=' + key,
    updateOrder: (id) => base + '/orders/' + encodeURIComponent(id) + '?api_key=' + key,
    deleteOrder: (id) => base + '/orders/' + encodeURIComponent(id) + '?api_key=' + key,
    getOrder: (id) => base + '/orders/' + encodeURIComponent(id) + '?api_key=' + key,
    getTutor: (id) => base + '/tutors/' + encodeURIComponent(id) + '?api_key=' + key,
    getCourse: (id) => base + '/courses/' + encodeURIComponent(id) + '?api_key=' + key,
  };
})();

// --- Загрузка данных ---
async function loadCoursesAndTutors() {
  // Выбираем URL по приоритету: window.API_CONFIG.API_ENDPOINTS если доступен
  const coursesUrl = (window.API_CONFIG && window.API_CONFIG.API_ENDPOINTS && window.API_CONFIG.API_ENDPOINTS.courses) ? window.API_CONFIG.API_ENDPOINTS.courses : API_ENDPOINTS.courses;
  const tutorsUrl = (window.API_CONFIG && window.API_CONFIG.API_ENDPOINTS && window.API_CONFIG.API_ENDPOINTS.tutors) ? window.API_CONFIG.API_ENDPOINTS.tutors : API_ENDPOINTS.tutors;

  // Отладочная информация в консоли
  console.info('[main] Requesting courses from:', coursesUrl);
  console.info('[main] Requesting tutors from:', tutorsUrl);

  // Создаём / обновляем видимый отладочный блок на странице, чтобы пользователь видел используемые URL
  try {
    let debugEl = document.getElementById('apiDebug');
    if (!debugEl) {
      debugEl = document.createElement('div');
      debugEl.id = 'apiDebug';
      debugEl.style.fontSize = '12px';
      debugEl.style.padding = '8px 12px';
      debugEl.style.background = '#fff3cd';
      debugEl.style.color = '#856404';
      debugEl.style.border = '1px solid #ffeeba';
      debugEl.style.margin = '10px auto';
      debugEl.style.maxWidth = '1200px';
      debugEl.style.borderRadius = '4px';
      const container = document.querySelector('.container') || document.body;
      container.insertBefore(debugEl, container.firstChild);
    }
    debugEl.textContent = `API endpoints: courses=${coursesUrl} | tutors=${tutorsUrl}`;
  } catch (domErr) {
    console.warn('Could not render apiDebug element', domErr);
  }

  // Выбираем fetch-обёртку если она доступна
  const fetchFn = (window.API_CONFIG && typeof window.API_CONFIG.fetchWithHeaders === 'function') ? window.API_CONFIG.fetchWithHeaders : fetch;

  try {
    // Попробуем параллельно загрузить оба ресурса
    const [coursesResp, tutorsResp] = await Promise.all([
      fetchFn(coursesUrl),
      fetchFn(tutorsUrl)
    ]);

    // Проверяем HTTP-статусы
    if (!coursesResp.ok || !tutorsResp.ok) {
      console.error('One or more API responses not ok', {
        courses: { status: coursesResp.status, statusText: coursesResp.statusText },
        tutors: { status: tutorsResp.status, statusText: tutorsResp.statusText }
      });
      notify('Ошибка загрузки данных. Проверьте API подключение', 'error');
      // Очистить данные и обновить отображение
      coursesData = [];
      tutorsData = [];
      displayCourses(1);
      displayTutors(1);
      return;
    }

    // Попытка распарсить JSON
    let coursesJson, tutorsJson;
    try {
      coursesJson = await coursesResp.json();
    } catch (jsonErr) {
      console.error('Failed to parse courses JSON', jsonErr);
      notify('Ошибка обработки данных курсов', 'error');
      coursesJson = [];
    }
    try {
      tutorsJson = await tutorsResp.json();
    } catch (jsonErr) {
      console.error('Failed to parse tutors JSON', jsonErr);
      notify('Ошибка обработки данных репетиторов', 'error');
      tutorsJson = [];
    }

    // Ожидаем, что API вернёт массивы
    coursesData = Array.isArray(coursesJson) ? coursesJson : (coursesJson && coursesJson.data ? coursesJson.data : []);
    tutorsData = Array.isArray(tutorsJson) ? tutorsJson : (tutorsJson && tutorsJson.data ? tutorsJson.data : []);

    displayCourses(1);
    displayTutors(1);
  } catch (err) {
    // Возможные сетевые ошибки или CORS
    console.error('Error loading data', err);
    // Попытка определить возможную CORS/Network проблему
    if (err instanceof TypeError && err.message && err.message.toLowerCase().includes('failed to fetch')) {
      console.error('Possible network/CORS error. Check API server CORS settings and network connectivity.', err);
      notify('Ошибка загрузки данных. Проверьте соединение с API и CORS настройки сервера', 'error');
    } else {
      notify('Ошибка загрузки данных', 'error');
    }

    // При ошибке можно очистить таблицы
    coursesData = [];
    tutorsData = [];
    displayCourses(1);
    displayTutors(1);
  }
}

// --- Отображение курсов ---
function displayCourses(page = 1) {
  currentCoursePage = Number(page) || 1;
  const tbody = document.getElementById('coursesBody');
  const containerId = 'coursesTableContainer';
  const emptyId = 'emptyCoursesMessage';
  if (!tbody) return;

  // Фильтрация по полям
  const search = (document.getElementById('courseSearch') && document.getElementById('courseSearch').value || '').trim().toLowerCase();
  const level = (document.getElementById('levelFilter') && document.getElementById('levelFilter').value) || '';

  let filtered = coursesData.filter(c => {
    let ok = true;
    if (search) ok = ok && (String(c.name || '').toLowerCase().includes(search));
    if (level) ok = ok && (String(c.level || '') === String(level));
    return ok;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE_LOCAL));
  if (currentCoursePage > totalPages) currentCoursePage = totalPages;

  const pageItems = paginate(filtered, currentCoursePage, ITEMS_PER_PAGE_LOCAL);

  // Очистка tbody
  tbody.innerHTML = '';

  if (!pageItems.length) {
    // Показать пустое сообщение
    if (typeof window.Utils === 'object' && typeof window.Utils.showEmptyState === 'function') {
      window.Utils.showEmptyState(containerId, emptyId);
    } else {
      // fallback: убрать таблицу и показать message element
      const container = document.getElementById(containerId);
      const empty = document.getElementById(emptyId);
      if (container) container.style.display = 'none';
      if (empty) { empty.classList.remove('hidden'); empty.style.display = ''; }
    }
    // Обновить пагинацию (очистить)
    const pagEl = document.getElementById('coursesPagination');
    if (pagEl) pagEl.innerHTML = '';
    return;
  }

  // Показать таблицу и скрыть пустое сообщение
  if (typeof window.Utils === 'object' && typeof window.Utils.showTableState === 'function') {
    window.Utils.showTableState(containerId, emptyId);
  } else {
    const container = document.getElementById(containerId);
    const empty = document.getElementById(emptyId);
    if (container) container.style.display = '';
    if (empty) empty.classList.add('hidden');
  }

  // Заполнение строк
  pageItems.forEach(course => {
    const tr = document.createElement('tr');
    const nameTd = document.createElement('td'); nameTd.textContent = course.name || '-';
    const levelTd = document.createElement('td'); levelTd.textContent = course.level || '-';
    const teacherTd = document.createElement('td'); teacherTd.textContent = course.teacher || '-';
    const weekTd = document.createElement('td'); weekTd.textContent = course.week_length != null ? String(course.week_length) : '-';
    const feeTd = document.createElement('td'); feeTd.textContent = course.course_fee_per_hour != null ? String(course.course_fee_per_hour) : '-';

    const actionTd = document.createElement('td');
    const btn = document.createElement('button');
    btn.className = 'btn btn-primary btn-order-course';
    btn.type = 'button';
    btn.setAttribute('data-id', course.id != null ? course.id : '');
    btn.textContent = 'Заказать';
    actionTd.appendChild(btn);

    tr.appendChild(nameTd);
    tr.appendChild(levelTd);
    tr.appendChild(teacherTd);
    tr.appendChild(weekTd);
    tr.appendChild(feeTd);
    tr.appendChild(actionTd);
    tbody.appendChild(tr);
  });

  // Обновление пагинации
  const pagEl = document.getElementById('coursesPagination');
  if (pagEl) {
    const html = createPaginationHtml(currentCoursePage, totalPages, function(p){
      currentCoursePage = p;
      displayCourses(p);
    });
    pagEl.innerHTML = html;

    // Если использована fallback createPaginationHtml (без window.Utils), нужно повесить обработчик
    if (!window.Utils) {
      pagEl.querySelectorAll('.page-link').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const p = Number(btn.getAttribute('data-page')) || 1;
          currentCoursePage = p;
          displayCourses(p);
        });
      });
    }
  }
}

// --- Отображение репетиторов ---
function displayTutors(page = 1) {
  currentTutorPage = Number(page) || 1;
  const tbody = document.getElementById('tutorsBody');
  const containerId = 'tutorsTableContainer';
  const emptyId = 'emptyTutorsMessage';
  if (!tbody) return;

  const lang = (document.getElementById('languageFilter') && document.getElementById('languageFilter').value) || '';
  const level = (document.getElementById('levelTutorFilter') && document.getElementById('levelTutorFilter').value) || '';
  const expVal = (document.getElementById('experienceFilter') && document.getElementById('experienceFilter').value) || '';
  const exp = expVal === '' ? null : Number(expVal);

  let filtered = tutorsData.filter(t => {
    let ok = true;
    if (lang) ok = ok && Array.isArray(t.languages_offered) ? t.languages_offered.includes(lang) : (t.languages_offered === lang);
    if (level) ok = ok && (String(t.language_level || '') === String(level));
    if (exp !== null) ok = ok && (Number(t.work_experience || 0) >= exp);
    return ok;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE_LOCAL));
  if (currentTutorPage > totalPages) currentTutorPage = totalPages;
  const pageItems = paginate(filtered, currentTutorPage, ITEMS_PER_PAGE_LOCAL);

  tbody.innerHTML = '';

  if (!pageItems.length) {
    if (typeof window.Utils === 'object' && typeof window.Utils.showEmptyState === 'function') {
      window.Utils.showEmptyState(containerId, emptyId);
    } else {
      const container = document.getElementById(containerId);
      const empty = document.getElementById(emptyId);
      if (container) container.style.display = 'none';
      if (empty) { empty.classList.remove('hidden'); empty.style.display = ''; }
    }
    const pagEl = document.getElementById('tutorsPagination');
    if (pagEl) pagEl.innerHTML = '';
    return;
  }

  if (typeof window.Utils === 'object' && typeof window.Utils.showTableState === 'function') {
    window.Utils.showTableState(containerId, emptyId);
  } else {
    const container = document.getElementById(containerId);
    const empty = document.getElementById(emptyId);
    if (container) container.style.display = '';
    if (empty) empty.classList.add('hidden');
  }

  pageItems.forEach(tutor => {
    const tr = document.createElement('tr');
    const nameTd = document.createElement('td'); nameTd.textContent = tutor.name || '-';
    const langTd = document.createElement('td'); langTd.textContent = Array.isArray(tutor.languages_offered) ? (tutor.languages_offered[0] || '-') : (tutor.languages_offered || '-');
    const levelTd = document.createElement('td'); levelTd.textContent = tutor.language_level || '-';
    const expTd = document.createElement('td'); expTd.textContent = tutor.work_experience != null ? String(tutor.work_experience) : '-';
    const priceTd = document.createElement('td'); priceTd.textContent = tutor.price_per_hour != null ? String(tutor.price_per_hour) : '-';

    const actionTd = document.createElement('td');
    const btn = document.createElement('button');
    btn.className = 'btn btn-select-tutor';
    btn.type = 'button';
    btn.setAttribute('data-id', tutor.id != null ? tutor.id : '');
    btn.textContent = 'Выбрать';
    actionTd.appendChild(btn);

    tr.appendChild(nameTd);
    tr.appendChild(langTd);
    tr.appendChild(levelTd);
    tr.appendChild(expTd);
    tr.appendChild(priceTd);
    tr.appendChild(actionTd);
    tbody.appendChild(tr);
  });

  // Пагинация
  const pagEl = document.getElementById('tutorsPagination');
  if (pagEl) {
    const html = createPaginationHtml(currentTutorPage, totalPages, function(p){
      currentTutorPage = p;
      displayTutors(p);
    });
    pagEl.innerHTML = html;

    if (!window.Utils) {
      pagEl.querySelectorAll('.page-link').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const p = Number(btn.getAttribute('data-page')) || 1;
          currentTutorPage = p;
          displayTutors(p);
        });
      });
    }
  }
}

// --- Фильтры ---
function filterCourses() {
  displayCourses(1);
}

function filterTutors() {
  displayTutors(1);
}

// --- Делегирование событий ---
function setupEventDelegation() {
  document.addEventListener('click', function (e) {
    const target = e.target;
    // Заказать курс
    if (target.matches && target.matches('.btn-order-course')) {
      const id = target.getAttribute('data-id');
      selectedCourseId = id;
      // Открываем модальную форму, если есть
      if (window.Utils && typeof window.Utils.openModal === 'function') {
        window.Utils.openModal('orderCourseModal');
      }
      notify('Курс выбран для заказа', 'info');
      return;
    }

    // Выбрать репетитора
    if (target.matches && target.matches('.btn-select-tutor')) {
      const id = target.getAttribute('data-id');
      selectedTutorId = id;
      // подсветить строку
      // убираем предыдущие выделения
      document.querySelectorAll('#tutorsBody tr').forEach(r => r.classList.remove('selected'));
      const row = target.closest('tr');
      if (row) row.classList.add('selected');
      notify('Репетитор выбран', 'success');
      return;
    }

    // Пагинация - если мы используем fallback render
    if (target.matches && target.matches('.page-link') && target.dataset && target.dataset.page) {
      const page = Number(target.dataset.page) || 1;
      // Определим, какую пагинацию нажали по ближайшему родителю
      const parent = target.closest('#coursesPagination');
      if (parent) {
        currentCoursePage = page;
        displayCourses(page);
        return;
      }
      const parent2 = target.closest('#tutorsPagination');
      if (parent2) {
        currentTutorPage = page;
        displayTutors(page);
        return;
      }
    }
  });
}

// --- Инициализация слушателей фильтров ---
function setupFilters() {
  const courseSearch = document.getElementById('courseSearch');
  const levelFilter = document.getElementById('levelFilter');
  if (courseSearch) courseSearch.addEventListener('input', filterCourses);
  if (levelFilter) levelFilter.addEventListener('change', filterCourses);

  const languageFilter = document.getElementById('languageFilter');
  const levelTutorFilter = document.getElementById('levelTutorFilter');
  const experienceFilter = document.getElementById('experienceFilter');
  if (languageFilter) languageFilter.addEventListener('change', filterTutors);
  if (levelTutorFilter) levelTutorFilter.addEventListener('change', filterTutors);
  if (experienceFilter) experienceFilter.addEventListener('input', filterTutors);
}

// --- DOMContentLoaded ---
document.addEventListener('DOMContentLoaded', function() {
  setupEventDelegation();
  setupFilters();
  loadCoursesAndTutors();
});
