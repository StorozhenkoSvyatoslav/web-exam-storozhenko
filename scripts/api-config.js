
const API_KEY = 'f11c2bed-fc0e-4034-b539-dba80b6521da';
const API_BASE = 'http://exam-api-courses.std-900.ist.mospolytech.ru/api';

function getApiUrl(endpoint) {
  if (!endpoint) return endpoint;
  if (endpoint.indexOf('?') !== -1) return endpoint;
  return endpoint + (endpoint.includes('?') ? '&' : '?') + 'api_key=' + API_KEY;
}

function fetchWithHeaders(url, options = {}) {
  const finalOptions = Object.assign({}, options);
  finalOptions.headers = Object.assign({}, finalOptions.headers || {});

  const method = (finalOptions.method || 'GET').toUpperCase();
  if (method === 'POST' || method === 'PUT') {
    if (!finalOptions.headers['Content-Type'] && !finalOptions.headers['content-type']) {
      finalOptions.headers['Content-Type'] = 'application/json';
    }
  }

  const finalUrl = getApiUrl(url);
  return fetch(finalUrl, finalOptions);
}

const ITEMS_PER_PAGE = 5;

const API_ENDPOINTS = {
  courses: API_BASE + '/courses?api_key=' + API_KEY,
  tutors: API_BASE + '/tutors?api_key=' + API_KEY,
  orders: API_BASE + '/orders?api_key=' + API_KEY,
  createOrder: API_BASE + '/orders?api_key=' + API_KEY, // POST
  updateOrder: (id) => API_BASE + '/orders/' + encodeURIComponent(id) + '?api_key=' + API_KEY, // PUT
  deleteOrder: (id) => API_BASE + '/orders/' + encodeURIComponent(id) + '?api_key=' + API_KEY, // DELETE
  getOrder: (id) => API_BASE + '/orders/' + encodeURIComponent(id) + '?api_key=' + API_KEY,
  getTutor: (id) => API_BASE + '/tutors/' + encodeURIComponent(id) + '?api_key=' + API_KEY,
  getCourse: (id) => API_BASE + '/courses/' + encodeURIComponent(id) + '?api_key=' + API_KEY,
};

window.API_CONFIG = {
  API_KEY,
  API_BASE,
  API_ENDPOINTS,
  fetchWithHeaders,
  getApiUrl,
  ITEMS_PER_PAGE,
};
