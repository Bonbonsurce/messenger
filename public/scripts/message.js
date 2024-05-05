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

function createNameLink(data, classLink) {
    const link = document.createElement('a');
    link.textContent = data.username || data.chat_name;
    link.classList.add(classLink);
    //link.classList.add('auth-link');
    if (data.chat_id) {
        link.href = `/message?chat_id=${data.chat_id}`;
    } else if (data.user_id) {
        link.href = `/message?user_id=${data.user_id}`;
    }
    return link;
}

function createButton(data, type) {
    const button = document.createElement('div');
    button.classList.add(type);
    button.textContent = type === 'invite-button' ? '➕' : '❌'; // Используем символ с более крупным размером плюса или крестик
    button.style.backgroundColor = type === 'invite-button' ? 'blue' : ''; // Синий фон или отсутствие фона

    button.addEventListener('click', () => {
        if (data.user_id) {
            delete_dialog(data.user_id); // Вызываем функцию delete_dialog с user_id
        } else if (data.chat_id) {
            if (type === 'invite-button') {
                inviteParticipant(data.chat_id);
                const form = document.getElementById('group-chat-adding');
                const chatIdInput = document.getElementById('chat-id-to-add'); // Получаем скрытое поле input с идентификатором чата
                const chatId = data.chat_id; // Получаем идентификатор чата (замените на вашу логику получения идентификатора)
                chatIdInput.value = chatId;
                form.style.display = 'block';
            }
            else {
                delete_chat(data.chat_id); // Вызываем функцию delete_dialog с chat_id
            }
        }
    });

    return button;
}

function createDialogDiv(messages) {
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

    return dialogDiv;
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

            if (error) {
                console.error('Ошибка при выполнении запроса:', error);
                return;
            }

            // Добавление пользователей в диалоги
            const dialogsSection = document.querySelector('.dialogs-section');
            users.forEach(user => {
                const dialogDiv = document.createElement('div');
                dialogDiv.classList.add('dialog-div', 'div-space-between');

                const userNameLink = createNameLink(user, 'auth-link');
                dialogDiv.appendChild(userNameLink);

                const deleteButton = createButton(user, 'delete-button');
                dialogDiv.appendChild(deleteButton);

                dialogsSection.appendChild(dialogDiv);
            });
            chats.forEach(chat => {
                const dialogDiv = document.createElement('div');
                dialogDiv.classList.add('dialog-div', 'red-background', 'div-space-between');

                const chatNameLink = createNameLink(chat, 'auth-link');
                dialogDiv.appendChild(chatNameLink);

                // Создаем блок с кнопками
                const buttonsContainer = document.createElement('div');
                buttonsContainer.classList.add('buttons-container');

                const deleteButton = createButton(chat, 'delete-button');
                buttonsContainer.appendChild(deleteButton);

                const inviteButton = createButton(chat, 'invite-button');
                dialogDiv.appendChild(inviteButton);

                // Добавляем блок с кнопками в блок диалога
                dialogDiv.appendChild(buttonsContainer);

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
            dialogsSection.appendChild(createDialogDiv(messages));

        } catch (error) {
            console.error('Ошибка при выполнении запроса:', error);
        }
    } else {
        //chatId != 0
        try {
            const response = await fetch(`/chat_conversation?chatId=${chatId}`);
            const { error, chat_messages } = await response.json();

            if (error) {
                console.error('Ошибка при выполнении запроса:', error);
                return;
            }

            // Добавление сообщений в диалог
            const dialogsSection = document.querySelector('.dialogs-section');
            dialogsSection.appendChild(createDialogDiv(chat_messages));

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

        fetch(`/chat_members?chat_id=${chatId}`)
            .then(response => response.json())
            .then(data => {
                if (!data || !data.users_info || data.users_info.length === 0 || !data.users_info[0].members_id) {
                    // Если информация пуста, перенаправляем пользователя
                    window.location.href = '/message';
                    return;
                }

                // Получаем информацию о пользователях из JSON-ответа
                const usersInfo = data.users_info;

                const membersIds = data.users_info.map(user => usersInfo[0].members_id);

                // Получаем элемент списка членов чата
                const chatMembersList = document.querySelector('.chat-members-check');

                // Очищаем список перед добавлением новых элементов
                chatMembersList.innerHTML = '';

                // Получаем информацию о последнем пользователе (пользователе с индексом usersInfo.length - 1)
                const lastUser = usersInfo[usersInfo.length - 1];
                usersInfo.pop();

                // Проверяем, является ли текущий пользователь создателем чата
                if (lastUser.user_id === usersInfo[0].creator_id) {
                    usersInfo.forEach(user => {
                        const listItem = document.createElement('li');
                        listItem.textContent = user.username; // Здесь может быть любая информация о пользователе, которую вы хотите отобразить

                        // Создаем чекбокс для каждого пользователя
                        const checkbox = document.createElement('input');
                        checkbox.type = 'checkbox';
                        checkbox.value = user.user_id;
                        if (user.user_id !== lastUser.user_id) {
                            listItem.appendChild(checkbox);
                        }

                        chatMembersList.appendChild(listItem);
                    });
                    // Создаем кнопку "Удалить выбранных"
                    const deleteButton = document.createElement('button');
                    deleteButton.id = 'delete-members-chat';
                    deleteButton.textContent = 'Удалить выбранных';
                    deleteButton.addEventListener('click', delete_members); // Привязываем функцию delete_members к событию click кнопки

                    // Добавляем кнопку в DOM после списка пользователей
                    chatMembersList.after(deleteButton);

                } else {
                    usersInfo.forEach(user => {
                        const listItem = document.createElement('li');
                        listItem.textContent = user.username;

                        chatMembersList.appendChild(listItem);
                    });
                }

                // Показываем форму с участниками чата
                document.querySelector('.list-chat-members').style.display = 'block';
            })
            .catch(error => console.error('Ошибка при получении информации о пользователях чата:', error));
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
                listItem.appendChild(createNameLink(message, 'a-list'));

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

async function delete_dialog(user_id) {
    try {
        const response = await fetch(`/delete_dialog?user_id=${user_id}`, {
            method: 'POST' // Укажите метод запроса как POST
        });

        if (!response.ok) {
            throw new Error('Ошибка при удалении диалога');
        }

        // Перенаправьте пользователя на страницу сообщений после успешного удаления
        window.location.href = '/message';
    } catch (error) {
        console.error('Ошибка при удалении диалога: ', error);
    }
}

async function delete_chat(chat_id){
    try {
        const response = await fetch(`/delete_chat_member?chat_id=${chat_id}`, {
            method: 'POST' // Укажите метод запроса как POST
        });

        if (!response.ok) {
            throw new Error('Ошибка при удалении диалога');
        }

        // Перенаправьте пользователя на страницу сообщений после успешного удаления
        window.location.href = '/message';
    } catch (error) {
        console.log('Ошибка при удалении чата: ', error);
    }
}

async function inviteParticipant(chat_id){
    const form = document.getElementById('group-chat-adding');
    const chatIdInput = document.getElementById('chat-id-to-add'); // Получаем скрытое поле input с идентификатором чата
    //const chatId = chat_id; // Получаем идентификатор чата (замените на вашу логику получения идентификатора)
    chatIdInput.value = chat_id;
    form.style.display = 'block'; // Показываем форму при нажатии на кнопку "Пригласить участника"

    try {
        const response = await fetch(`/add_to_chat?chat_id=${chat_id}`);
        const data = await response.json();

        if (data.error) {
            return;
        }

        const friends = data.friends;

        // Получаем ссылку на список друзей
        const friendsList = document.getElementById('friends-add-list');

        // Очищаем список перед добавлением новых друзей
        friendsList.innerHTML = '';

        if (friends.length === 0) {
            const listItem = document.createElement('li');
            const label = document.createElement('label');
            label.textContent = 'Все друзья добавлены';
            listItem.appendChild(label);
            friendsList.appendChild(listItem);
        } else {
            // Для каждого друга создаем элемент списка и чекбокс
            friends.forEach(friend => {
                const listItem = document.createElement('li');
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.value = friend.user_id; // Устанавливаем значение чекбокса равное идентификатору друга
                const label = document.createElement('label');
                label.textContent = friend.username; // Устанавливаем текст метки равным имени друга
                listItem.appendChild(checkbox);
                listItem.appendChild(label);
                friendsList.appendChild(listItem);
            });
        }
    } catch (error) {
        console.log("Ошибка при добавлении участника чата:", error);
    }
}

function close_adding() {
    const form = document.getElementById('group-chat-adding');
    form.style.display = 'none';
}

async function add_member_to_chat() {
    // Получаем список чекбоксов
    const checkboxes = document.querySelectorAll('#friends-add-list input[type="checkbox"]:checked');

    // Создаем массив для хранения выбранных пользователей
    const selectedUsers = [];

    // Перебираем чекбоксы и добавляем выбранных пользователей в массив
    checkboxes.forEach(checkbox => {
        selectedUsers.push(checkbox.value);
    });

    // Получаем идентификатор чата из скрытого поля
    const chatId = document.getElementById('chat-id-to-add').value;

    try {
        // Отправляем запрос на сервер для добавления выбранных пользователей в чат
        const response = await fetch('/add_members_to_chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                chat_id: chatId,
                users: selectedUsers
            })
        });

        const data = await response.json();

        // Проверяем, успешно ли добавлены участники
        if (data.success) {
            console.log('Участники успешно добавлены в чат');
        } else {
            console.error('Ошибка при добавлении участников в чат:', data.error);
        }
    } catch (error) {
        console.error('Ошибка при выполнении запроса:', error);
    }
}

function delete_members() {
    // Получаем все чекбоксы
    const checkboxes = document.querySelectorAll('.chat-members-check input[type="checkbox"]');

    // Проверяем, выбран ли хотя бы один чекбокс
    let anyChecked = false;
    checkboxes.forEach(checkbox => {
        if (checkbox.checked) {
            anyChecked = true;
            return;
        }
    });

    // Если ни один чекбокс не выбран, выводим сообщение об ошибке
    if (!anyChecked) {
        alert('Выберите хотя бы одного пользователя для удаления');
        return;
    }

    // Получаем ID чата
    const chatId = document.getElementById('chat_id').value;

    // Создаем массив для хранения ID пользователей, которых нужно удалить
    const usersToDelete = [];

    // Проходим по всем чекбоксам и добавляем ID выбранных пользователей в массив usersToDelete
    checkboxes.forEach(checkbox => {
        if (checkbox.checked) {
            usersToDelete.push(checkbox.value);
        }
    });

    // Отправляем запрос на сервер для удаления выбранных пользователей из чата
    fetch('/delete_chat_members', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ chatId: chatId, usersToDelete: usersToDelete })
    })
        .then(response => {
            if (response.ok) {
                // Обновляем страницу или выполняем другие действия после успешного удаления
                window.location.reload();
            } else {
                throw new Error('Ошибка удаления пользователей из чата');
            }
        })
        .catch(error => {
            console.error('Произошла ошибка:', error);
            alert('Произошла ошибка при удалении пользователей из чата');
        });
}
