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
                textMessage.textContent = message.username + ': ' + message.message_text;
                dialogDiv.appendChild(textMessage);

                /*const RecieverName = document.createElement('p');
                RecieverName.textContent = message.username;
                dialogDiv.appendChild(RecieverName);*/
            });

            dialogsSection.appendChild(dialogDiv);
        } else {
            console.log('Нет сообщений для отображения');
        }
    }
});