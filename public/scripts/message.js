document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('user_id');

    if (userId) {
        // Если параметр user_id есть в адресной строке, показываем форму
        document.getElementById('messageForm').style.display = 'block';
        document.getElementById('receiver_id').value = userId;
    }
});

document.addEventListener('DOMContentLoaded', async function() {
    const urlParams = new URLSearchParams(window.location.search);
    const idReceiver = urlParams.get('user_id');

    if (idReceiver == null) {
        const response = await fetch('/all_mes_show');
        const data = await response.json();

        // Проверяем, есть ли ошибка
        if (data.error) {
            console.error('Ошибка при выполнении запроса:', data.error);
            return;
        }

        // Получаем список пользователей
        const users = data.users;

        // Обрабатываем данные, например, добавляем каждое имя пользователя в документ
        const dialogsSection = document.querySelector('.dialogs-section');
        users.forEach(user => {
            // Создаем блок dialog-div для каждого пользователя
            const dialogDiv = document.createElement('div');
            dialogDiv.classList.add('dialog-div'); // добавляем класс для стилизации

            // Создаем элемент <p> с именем пользователя и добавляем его в блок dialog-div
            const usernameLink = document.createElement('a');
            usernameLink.textContent = user.username;
            usernameLink.classList.add('auth-link');
            usernameLink.href = `/message?user_id=${user.user_id}`;

            dialogDiv.appendChild(usernameLink);

            // Добавляем блок dialog-div в общий блок dialogsSection
            dialogsSection.appendChild(dialogDiv);
        });
    }
    else {
        console.log(idReceiver);
        const response = await fetch(`/conversation?idReceiver=${idReceiver}`);
        const data = await response.json();
        // Проверяем, есть ли ошибка
        if (data.error) {
            console.error('Ошибка при выполнении запроса:', data.error);
            return;
        }

        const messages = data.messages;

        // Проверяем, есть ли сообщения
        if (messages && messages.length > 0) {
            const dialogsSection = document.querySelector('.dialogs-section');
            const dialogDiv = document.createElement('div');
            dialogDiv.classList.add('dialog-div'); // добавляем класс для стилизации

            messages.forEach(message => {
                const textMessage = document.createElement('p');
                textMessage.textContent = 'Отправил  ' +  message.username + ': ' + message.message_text;
                dialogDiv.appendChild(textMessage);
            });

            dialogsSection.appendChild(dialogDiv);
        } else {
            console.log('Нет сообщений для отображения');
        }
    }
});

async function write_new() {
    let formas = document.getElementById('additional-form');
    formas.style.display = 'block';

    let btn = document.getElementById('write_new_user');
    btn.style.display = 'none';

    const response = await fetch(`/write_new`);
    const data = await response.json();
    // Проверяем, есть ли ошибка
    if (data.error) {
        console.error('Ошибка при выполнении запроса:', data.error);
        return;
    }
    console.log(data);
    const usernames = data.message;

    if (usernames && usernames.length > 0) {
        const userList = document.getElementById("user-list");
        userList.innerHTML = "";

        usernames.forEach(message => {
            var listItem = document.createElement("li");

            // Создаем ссылку для пользователя
            var userLink = document.createElement("a");
            userLink.classList.add('a-list');
            userLink.href = `/message?user_id=${message.user_id}`; // Здесь укажите ссылку на профиль пользователя или другую страницу
            userLink.textContent = message.username;

            // Добавляем ссылку в элемент списка
            listItem.appendChild(userLink);

            // Добавляем элемент списка в список пользователей
            userList.appendChild(listItem);
        });
    } else {
        console.log('Нет сообщений для отображения');
    }
}

function close_users(){
    let btn = document.getElementById('write_new_user');
    btn.style.display = 'block';

    let formas = document.getElementById('additional-form');
    formas.style.display = 'none';
}