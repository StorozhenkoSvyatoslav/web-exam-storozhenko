'use strict';

// Глобальные переменные
let coursesData = [];
let tutorsData = [];
let selectedTutorId = null;
let selectedCourseId = null;
let currentCoursePage = 1;
let currentTutorPage = 1;
const ITEMS_PER_PAGE = 5;

// Безопасные ссылки на утилиты, если они подключены
const notify = (window.Utils && typeof window.Utils.showNotification === 'function') ? window.Utils.showNotification : function(msg, type='info') { console.log(type.toUpperCase(), msg); };
const paginate = (window.Utils && typeof window.Utils.paginateArray === 'function') ? window.Utils.paginateArray : function(arr, page, perPage = ITEMS_PER_PAGE){ if(!Array.isArray(arr)) return []; page = Number(page)||1; perPage = Number(perPage)||ITEMS_PER_PAGE; const start = (page-1)*perPage; return arr.slice(start, start+perPage); };
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

// Определение API_ENDPOINTS с запасным вариантом
const API_ENDPOINTS = window.API_ENDPOINTS || {
  courses: (window.API_CONFIG && window.API_CONFIG.baseUrl ? window.API_CONFIG.baseUrl : '') + '/api/courses',
  tutors: (window.API_CONFIG && window.API_CONFIG.baseUrl ? window.API_CONFIG.baseUrl : '') + '/api/tutors'
};

// --- Загрузка данных ---
async function loadCoursesAndTutors() {
  try {
    // Попробуем параллельно загрузить оба ресурса
    const [coursesResp, tutorsResp] = await Promise.all([
      fetch(API_ENDPOINTS.courses),
      fetch(API_ENDPOINTS.tutors)
    ]);

    if (!coursesResp.ok || !tutorsResp.ok) {
      throw new Error('Network response not ok');
    }

    const coursesJson = await coursesResp.json();
    const tutorsJson = await tutorsResp.json();

    // Ожидаем, что API вернёт массивы
    coursesData = Array.isArray(coursesJson) ? coursesJson : (coursesJson.data || []);
    tutorsData = Array.isArray(tutorsJson) ? tutorsJson : (tutorsJson.data || []);

    displayCourses(1);
    displayTutors(1);
  } catch (err) {
    console.error('Error loading data', err);
    notify('Ошибка загрузки данных', 'error');

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

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  if (currentCoursePage > totalPages) currentCoursePage = totalPages;

  const pageItems = paginate(filtered, currentCoursePage, ITEMS_PER_PAGE);

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

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  if (currentTutorPage > totalPages) currentTutorPage = totalPages;
  const pageItems = paginate(filtered, currentTutorPage, ITEMS_PER_PAGE);

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
