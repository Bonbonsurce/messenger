// Получаем ссылку на выпадающий список и все блоки
const friendSelect = document.getElementById("friend-select");
const youFollowBlock = document.getElementById('follow');
const friendBlock = document.getElementById('friends');
const followToYouBlock = document.getElementById('followers');

// Назначаем обработчик события при изменении выбранной опции в списке
friendSelect.addEventListener("change", function() {
    // Скрываем все блоки
    friendBlock.style.display = "none";
    youFollowBlock.style.display = "none";
    followToYouBlock.style.display = "none";

    // Определяем, какой блок нужно показать в зависимости от выбранной опции
    const selectedOption = friendSelect.value;
    switch (selectedOption) {
        case "you-follow":
            youFollowBlock.style.display = "block";
            break;
        case "friend-block":
            friendBlock.style.display = "block";
            break;
        case "follow-to-you":
            followToYouBlock.style.display = "block";
            break;
        default:
            console.error("Неизвестная опция выбрана в выпадающем списке");
    }
});

document.addEventListener('DOMContentLoaded', async function() {
    try {
        console.log('hello');
        const response = await fetch('/friends_info');
        const data = await response.json();

        // Проверяем, содержит ли ответ ошибку
        if (data.error) {
            console.error('Ошибка:', data.error);
            return;
        }

        // Получаем информацию о подписках, подписчиках и друзьях
        const follows = data.follows;
        const followers = data.followers;
        const friends = data.friends;
        console.log(follows);

        if (follows && follows.length > 0) {
            const followList = document.getElementById("follow-list");
            followList.innerHTML = "";

            follows.forEach(follow => {
                var listItem = document.createElement("li");

                // Создаем ссылку для пользователя
                var followLink = document.createElement("a");
                followLink.classList.add('a-list');
                followLink.href = `/profile?user_id=${follow.following_id}`; // Здесь укажите ссылку на профиль пользователя или другую страницу
                followLink.textContent = follow.username;

                // Добавляем ссылку в элемент списка
                listItem.appendChild(followLink);

                // Добавляем элемент списка в список пользователей
                followList.appendChild(listItem);
            });
        } else {
            console.log('Нет сообщений для отображения');
        }

        if (followers && followers.length > 0) {
            const followerList = document.getElementById("follower-list");
            followerList.innerHTML = "";

            followers.forEach(follower => {
                var listItem = document.createElement("li");

                // Создаем ссылку для пользователя
                var followerLink = document.createElement("a");
                followerLink.classList.add('a-list');
                followerLink.href = `/profile?user_id=${follower.follower_id}`; // Здесь укажите ссылку на профиль пользователя или другую страницу
                followerLink.textContent = follower.username;

                // Добавляем ссылку в элемент списка
                listItem.appendChild(followerLink);

                // Добавляем элемент списка в список пользователей
                followerList.appendChild(listItem);
            });
        } else {
            console.log('Нет сообщений для отображения');
        }

        if (friends && friends.length > 0) {
            const friendList = document.getElementById("friend-list");
            friendList.innerHTML = "";

            friends.forEach(friend => {
                var listItem = document.createElement("li");

                // Создаем ссылку для пользователя
                var friendLink = document.createElement("a");
                friendLink.classList.add('a-list');
                friendLink.href = `/profile?user_id=${friend.user_id_2}`; // Здесь укажите ссылку на профиль пользователя или другую страницу
                friendLink.textContent = friend.username;

                // Добавляем ссылку в элемент списка
                listItem.appendChild(friendLink);

                // Добавляем элемент списка в список пользователей
                friendList.appendChild(listItem);
            });
        } else {
            console.log('Нет сообщений для отображения');
        }

    } catch (error) {
        console.error('Ошибка при получении информации о друзьях:', error);
    }
});