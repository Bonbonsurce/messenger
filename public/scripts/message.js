const errorMessage = document.getElementById('error-message');
const errorText = document.getElementById('error-text');

// Функция для отображения сообщения об ошибке
function displayErrorMessage(message) {
    errorText.textContent = message;
    errorMessage.style.display = 'block';
}

// Функция для закрытия сообщения об ошибке
function closeErrorMessage() {
    errorMessage.style.display = 'none';
}

document.addEventListener('DOMContentLoaded', async function() {
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('user_id');

    const chatId = urlParams.get('chat_id');

    if (userId == null && chatId == null) {
        try {
            // Выполнение запроса на получение всех сообщений
            const response = await fetch('/all_mes_show');
            const { error, users, chats} = await response.json();
            console.log('Это чаты:', chats);
            if (error) {
                console.error('Ошибка при выполнении запроса:', error);
                return;
            }

            // Добавление пользователей в диалоги
            const dialogsSection = document.querySelector('.dialogs-section');
            users.forEach(user => {
                const dialogDiv = document.createElement('div');
                dialogDiv.classList.add('dialog-div');
                const usernameLink = document.createElement('a');
                usernameLink.textContent = user.username;
                usernameLink.classList.add('auth-link');
                usernameLink.href = `/message?user_id=${user.user_id}`;
                dialogDiv.appendChild(usernameLink);
                dialogsSection.appendChild(dialogDiv);
            });
            chats.forEach(chat => {
                const dialogDiv = document.createElement('div');
                dialogDiv.classList.add('dialog-div');
                dialogDiv.classList.add('red-background');
                const chatnameLink = document.createElement('a');
                chatnameLink.textContent = chat.chat_name;
                chatnameLink.classList.add('auth-link');
                chatnameLink.href = `/message?chat_id=${chat.chat_id}`;
                dialogDiv.appendChild(chatnameLink);
                dialogsSection.appendChild(dialogDiv);
            });
        } catch (error) {
            console.error('Ошибка при выполнении запроса:', error);
        }
    } else if (userId != null && chatId == null) {
        try {
            // Выполнение запроса на получение переписки с выбранным пользователем
            const response = await fetch(`/conversation?idReceiver=${userId}`);
            const { error, messages } = await response.json();

            if (error) {
                console.error('Ошибка при выполнении запроса:', error);
                return;
            }

            // Добавление сообщений в диалог
            const dialogsSection = document.querySelector('.dialogs-section');
            const dialogDiv = document.createElement('div');
            dialogDiv.classList.add('dialog-div');

            if (messages && messages.length > 0) {
                messages.forEach(message => {
                    const textMessage = document.createElement('p');
                    textMessage.textContent = `Отправил ${message.username}: ${message.message_text}`;
                    dialogDiv.appendChild(textMessage);
                });
            } else {
                console.log('Нет сообщений для отображения');
            }

            dialogsSection.appendChild(dialogDiv);
        } catch (error) {
            console.error('Ошибка при выполнении запроса:', error);
        }
    } else {
        //chatId != 0
        try {
            const response = await fetch(`/chat_conversation?chatId=${chatId}`);
            const { error, chat_messages } = await response.json();
            console.log('Hello', chat_messages);
            if (error) {
                console.error('Ошибка при выполнении запроса:', error);
                return;
            }

            // Добавление сообщений в диалог
            const dialogsSection = document.querySelector('.dialogs-section');
            const dialogDiv = document.createElement('div');
            dialogDiv.classList.add('dialog-div');

            if (chat_messages && chat_messages.length > 0) {
                chat_messages.forEach(chat_message => {
                    const textMessage = document.createElement('p');
                    textMessage.textContent = `Отправил ${chat_message.user_id}: ${chat_message.message_text}`;
                    dialogDiv.appendChild(textMessage);
                });
            } else {
                console.log('Нет сообщений для отображения');
            }

            dialogsSection.appendChild(dialogDiv);
        } catch (error) {
            console.log('Ошибка при выполнении запроса', error);
        }
    }

    if (userId) {
        // Если параметр user_id есть в адресной строке, показываем форму
        document.getElementById('messageForm').style.display = 'block';
        document.getElementById('receiver_id').value = userId;
    }

    if (chatId) {
        document.getElementById('chat-messageForm').style.display = 'block';
        document.getElementById('chat_id').value = chatId;
    }
});

async function write_new() {
    try {
        // Отображение дополнительной формы для написания нового сообщения
        let formas = document.getElementById('additional-form');
        formas.style.display = 'block';

        // Скрытие кнопки для написания нового сообщения
        let btn = document.getElementById('write_new_user');
        btn.style.display = 'none';

        // Выполнение запроса на получение списка пользователей для отправки сообщения
        const response = await fetch(`/write_new`);
        const { error, message: usernames } = await response.json();

        if (error) {
            console.error('Ошибка при выполнении запроса:', error);
            return;
        }

        if (usernames && usernames.length > 0) {
            // Отображение списка пользователей для отправки сообщения
            const userList = document.getElementById("user-list");
            userList.innerHTML = "";

            usernames.forEach(message => {
                var listItem = document.createElement("li");
                var userLink = document.createElement("a");
                userLink.classList.add('a-list');
                userLink.href = `/message?user_id=${message.user_id}`;
                userLink.textContent = message.username;
                listItem.appendChild(userLink);
                userList.appendChild(listItem);
            });
        } else {
            console.log('Нет пользователей для отображения');
        }
    } catch (error) {
        console.error('Ошибка при выполнении запроса:', error);
    }
}

function close_users(){
    let btn = document.getElementById('write_new_user');
    btn.style.display = 'block';

    let formas = document.getElementById('additional-form');
    formas.style.display = 'none';
}

function close_group(){
    let btn = document.getElementById('start-group-chat');
    btn.style.display = 'block';

    let formas = document.getElementById('group-chat');
    formas.style.display = 'none';
}

async function group_chat() {
    try {
        let formas = document.getElementById('group-chat');
        formas.style.display = 'block';

        // Скрытие кнопки для написания нового сообщения
        let btn = document.getElementById('start-group-chat');
        btn.style.display = 'none';

        const response = await fetch('/friends_info');
        const data = await response.json();

        // Проверяем, содержит ли ответ ошибку
        if (data.error) {
            console.error('Ошибка:', data.error);
            return;
        }

        // Получаем информацию о друзьях
        const friends = data.friends;

        let friendsList = document.getElementById('friends-chat-list');

        // Очищаем контейнер перед добавлением новых элементов
        friendsList.innerHTML = '';

        // Создаем чекбоксы для каждого друга
        friends.forEach(friend => {
            let checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.name = 'participant';
            checkbox.value = friend.user_id_2;

            let label = document.createElement('label');
            label.textContent = friend.username; // Предполагая, что в объекте друга есть свойство "username"
            label.appendChild(checkbox);

            friendsList.appendChild(label);
            friendsList.appendChild(document.createElement('br'));
        });

    } catch (error) {
        console.error('Ошибка при выполнении запроса:', error);
    }
}

function create_chat(){
    try {
        // Получаем значение поля названия чата
        const chatName = document.getElementById("chat-name").value;

        if (chatName == '') {
            alert('Введите название чата');
            displayErrorMessage('Введите название чата');
            return; // Прерываем выполнение функции, так как поле пустое
        }

        // Получаем выбранных участников
        const selectedParticipants = [];
        const checkboxes = document.querySelectorAll('#friends-chat-list input[type="checkbox"]:checked');
        checkboxes.forEach(checkbox => {
            selectedParticipants.push(checkbox.value);
        });

        if (selectedParticipants.length == 0) {
            alert('Выберите хотя бы одного участника');
            displayErrorMessage('Выберите хотя бы одного участника');
            return; // Прерываем выполнение функции, так как нет выбранных участников
        }

        const data = {
            chatName: chatName,
            participants: selectedParticipants
        };

        // Отправляем POST-запрос на сервер
        fetch('/create_chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Ошибка сети');
                }
                return response.json();
            })
            .then(data => {
                console.log('Ответ от сервера:', data);
                // Дополнительная обработка успешного ответа от сервера
            })
            .catch(error => {
                console.error('Ошибка при отправке запроса:', error);
                // Дополнительная обработка ошибки
            });



        // Очистим поля формы после создания чата
        document.getElementById("chat-name").value = "";

        // Закроем форму после создания чата
        close_group();
    } catch (error) {
        console.error('Ошибка при создании группового чата:', error);
    }
}