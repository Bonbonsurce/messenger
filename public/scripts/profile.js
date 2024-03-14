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
});
