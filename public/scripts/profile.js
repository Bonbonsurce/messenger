document.addEventListener('DOMContentLoaded', async function () {
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('user_id');

    try {
        if (!userId) {
            const userInfo = await fetchInfo(-1, 'user_info');
            displayUserInfo(userInfo.info);
            document.getElementById("id-edit-button").style.display = "block";
            document.getElementById("id-add-photo-button").style.display = "block";
            document.getElementById("id-settings-button").style.display = "block";

        } else {
            // Если есть идентификатор пользователя, запрашиваем данные о пользователе и его статусе дружбы
            const [userData, friendStatus] = await Promise.all([
                fetchInfo(userId, 'user_info'),
                fetchInfo(userId, 'check_friendship')
            ]);
            document.getElementById("id-edit-button").style.display = "none";
            document.getElementById("id-add-photo-button").style.display = "none";
            document.getElementById("id-settings-button").style.display = "none";
            // Отображение информации о пользователе
            displayUserInfo(userData.info);
            createFriendshipButton(userId, friendStatus.friendshipStatus);
        }
    } catch (error) {
        console.error('Ошибка при выполнении запроса:', error);
    }
});

async function fetchInfo(userId, route) {
    const response = await fetch(`/${route}?user_id=${userId}`);
    const data = await response.json();

    if (data.error) {
        throw new Error(data.error);
    }

    return data;
}


// Функция для отображения информации о пользователе
function displayUserInfo(userInfo) {
    if (userInfo) {
        const userInfoData = userInfo[0];
        document.getElementById('user-name').textContent = `Имя пользователя: ${userInfoData.username || "Не указано"}`;
        document.getElementById('user-email').textContent = `Электронная почта пользователя: ${userInfoData.email || "Не указано"}`;
        document.getElementById('user-date').textContent = `Дата регистрации: ${userInfoData.registration_date ? userInfoData.registration_date.substring(0, 10) : "Не указано"}`;
        document.getElementById('image-logo').src = userInfoData.logo_img || "";
    } else {
        console.log('Информация о пользователе не найдена');
    }
}

// Функция для создания кнопки добавления/удаления из друзей
function createFriendshipButton(userId, friendStatus) {
    const buttonContainer = document.querySelector('.profile-section');
    const button = document.createElement('button');

    if (friendStatus === 'friend') {
        button.textContent = 'Удалить из друзей';
        button.classList.add('remove-friend-button');
        button.addEventListener('click', () => handleFriendAction(userId, 'remove'));
    } else {
        button.textContent = 'Добавить в друзья';
        button.classList.add('add-friend-button');
        button.addEventListener('click', () => handleFriendAction(userId, 'add'));
    }

    buttonContainer.appendChild(button);
}

// Обработчик действия с другом (добавить/удалить)
async function handleFriendAction(userId, action) {
    try {
        const response = await fetch(action === 'add' ? '/add_friend' : '/remove_friend', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ friendId: userId })
        });

        if (response.redirected) {
            window.location.href = response.url;
        } else {
            const data = await response.json();

            if (response.ok) {
                console.log(`Друг успешно ${action === 'add' ? 'добавлен' : 'удален'}`);
            } else {
                console.error(`Ошибка при ${action === 'add' ? 'добавлении' : 'удалении'} друга:`, data.error);
            }
        }
    } catch (error) {
        console.error(`Ошибка при ${action === 'add' ? 'добавлении' : 'удалении'} друга:`, error.message);
    }
}

//СТАРЫЙ КОД - РАБОЧИЙ НО НЕ ОПТИМИЗИРОВАННЫЙ
/*
document.addEventListener('DOMContentLoaded', async function () {
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('user_id');

    if (userId) {
        console.log(userId);
        // Если есть параметр user_id, то делаем запрос на сервер для получения данных о пользователе из другой таблицы
        try {
            const response = await fetch(`/user_info?user_id=${userId}`);
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
                if (userInfo[0].logo_img) {
                    userLogo.src = userInfo[0].logo_img;
                }
            } else {
                console.log('Информация о пользователе не найдена');
            }
        } catch (error) {
            console.error('Ошибка при выполнении запроса:', error);
        }
        // Проверяем, есть ли пользователь в списке ваших друзей
        const friendResponse = await fetch(`/check_friendship?user_id=${userId}`);
        const friendData = await friendResponse.json();

        if (friendData.error) {
            console.error('Ошибка при выполнении запроса:', friendData.error);
            return;
        }
        const friendStatus = friendData.friendshipStatus;

        // Создаем кнопку в зависимости от статуса дружбы
        const buttonContainer = document.querySelector('.profile-section');

        if (friendStatus === 'friend') {
            const removeFriendButton = document.createElement('button');
            removeFriendButton.textContent = 'Удалить из друзей';
            removeFriendButton.classList.add('remove-friend-button');
            buttonContainer.appendChild(removeFriendButton);

            removeFriendButton.addEventListener('click', async function () {
                try {
                    const response = await fetch('/remove_friend', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ friendId: userId }) // Передача идентификатора друга
                    });

                    // Проверяем, было ли перенаправление
                    if (response.redirected) {
                        window.location.href = response.url; // Перенаправляем на новую страницу
                    } else {
                        // Если не было перенаправления, обрабатываем ответ как JSON
                        const data = await response.json();

                        if (response.ok) {
                            console.log('Друг успешно удален');
                            // Здесь вы можете добавить дополнительные действия после успешного добавления друга, например, обновление интерфейса
                        } else {
                            console.error('Ошибка при удалении друга:', data.error);
                        }
                    }
                } catch (error) {
                    console.error('Ошибка при удалении друга:', error.message);
                }
            });

        } else {
            const addFriendButton = document.createElement('button');
            addFriendButton.textContent = 'Добавить в друзья';
            addFriendButton.classList.add('add-friend-button');
            buttonContainer.appendChild(addFriendButton);

            addFriendButton.addEventListener('click', async function () {
                try {
                    const response = await fetch('/add_friend', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ friendId: userId }) // Передача идентификатора друга
                    });

                    // Проверяем, было ли перенаправление
                    if (response.redirected) {
                        window.location.href = response.url; // Перенаправляем на новую страницу
                    } else {
                        // Если не было перенаправления, обрабатываем ответ как JSON
                        const data = await response.json();

                        if (response.ok) {
                            console.log('Друг успешно добавлен');
                            // Здесь вы можете добавить дополнительные действия после успешного добавления друга, например, обновление интерфейса
                        } else {
                            console.error('Ошибка при добавлении друга:', data.error);
                        }
                    }
                } catch (error) {
                    console.error('Ошибка при добавлении друга:', error.message);
                }
            });
        }

    } else {
        // Если параметр user_id отсутствует, то используем текущую таблицу для получения данных о пользователе
        const response = await fetch(`/user_info?user_id=${-1}`);
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
    }
});*/
