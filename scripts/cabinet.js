// Простая логика для кабинета: модальные окна, мок-данные и пагинация-заглушка
function openModal(id){
  const el = document.getElementById(id);
  if(el) el.classList.remove('hidden');
}
function closeModal(id){
  const el = document.getElementById(id);
  if(el) el.classList.add('hidden');
}
function logout(){
  alert('Выход (заглушка)');
}
function saveOrder(){
  alert('Сохранено (заглушка)');
  closeModal('editModal');
}
function confirmDelete(){
  alert('Удалено (заглушка)');
  closeModal('deleteConfirmModal');
}

// Мок: добавить одну запись в таблицу заказов при загрузке для визуальной проверки
document.addEventListener('DOMContentLoaded', function(){
  const tbody = document.getElementById('ordersBody');
  if(tbody){
    tbody.innerHTML = '';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td data-label="№">1</td>
      <td data-label="Курс/Репетитор">Курс: Английский (Group)</td>
      <td data-label="Дата начала">2026-02-01</td>
      <td data-label="Время">18:00</td>
      <td data-label="Продолжительность">1 час</td>
      <td data-label="Стоимость">1200</td>
      <td data-label="Действия">
        <div class="table-actions">
          <button class="btn btn-sm btn-primary" onclick="openModal('detailsModal')">Просмотр</button>
          <button class="btn btn-sm btn-secondary" onclick="openModal('editModal')">Редактировать</button>
          <button class="btn btn-sm btn-danger" onclick="openModal('deleteConfirmModal')">Удалить</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  }
});
