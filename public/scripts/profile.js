document.addEventListener('DOMContentLoaded', async function () {
    const response = await fetch('/user_info');
    const data = await response.json();

    if (data.error) {
        console.error('Ошибка при выполнении запроса:', data.error);
        return;
    }

    const userInfo = data.info;


    // Получаем ссылки на элементы HTML для отображения информации о пользователе
    const userNameElement = document.getElementById('user-name');
    const userEmailElement = document.getElementById('user-email');
    const userDateElement = document.getElementById('user-date');
    const userLogo = document.getElementById('image-logo');
    // Заполняем поля информацией о пользователе
    if (userInfo) {
        userNameElement.textContent = 'Имя пользователя: ' + userInfo[0].username || "Не указано";
        userEmailElement.textContent = 'Электронная почта пользователя: ' + userInfo[0].email || "Не указано";
        userDateElement.textContent = 'Дата регистрации: ' + userInfo[0].registration_date.substring(0, 10) || "Не указано";
        userLogo.src = userInfo[0].logo_img;
    } else {
        console.log('Информация о пользователе не найдена');
    }
});