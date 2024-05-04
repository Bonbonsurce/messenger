// Получаем ссылку на выпадающий список и все блоки
let friendSelect = document.getElementById("friend-select");
let youFollowBlock = document.getElementById('follow');
let friendBlock = document.getElementById('friends');
let followToYouBlock = document.getElementById('followers');

// Назначаем обработчик события при изменении выбранной опции в списке
friendSelect.addEventListener("change", function() {
    // Скрываем все блоки
    friendBlock.style.display = "none";
    youFollowBlock.style.display = "none";
    followToYouBlock.style.display = "none";

    // Определяем, какой блок нужно показать в зависимости от выбранной опции
    let selectedOption = friendSelect.value;
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
        let response = await fetch('/friends_info');
        let data = await response.json();

        // Проверяем, содержит ли ответ ошибку
        if (data.error) {
            console.error('Ошибка:', data.error);
            return;
        }

        // Получаем информацию о подписках, подписчиках и друзьях
        let follows = data.follows;
        let followers = data.followers;
        let friends = data.friends;

        // Отображаем данные в списках
        displayFriends(follows,"follow-list");
        displayFriends(followers, "follower-list");
        displayFriends(friends, "friend-list");

    } catch (error) {
        console.error('Ошибка при получении информации о друзьях:', error);
    }
});

function displayFriends(friends, listId) {
    if (friends && friends.length > 0) {
        let list = document.getElementById(listId);
        list.innerHTML = "";
        friends.forEach(friend => {
            let listItem = document.createElement("li");
            let link = document.createElement("a");
            link.classList.add('a-list');
            link.href = `/profile?user_id=${friend.user_id}`;
            link.textContent = friend.username;
            listItem.appendChild(link);
            list.appendChild(listItem);
        });
    } else {
        console.log('Нет сообщений для отображения');
    }
}

document.addEventListener('DOMContentLoaded', function () {
    const searchForm = document.querySelector('.search form');
    const findFriendsDiv = document.getElementById('find-friends');

    searchForm.addEventListener('submit', async function (event) {
        event.preventDefault();

        const formData = new FormData(searchForm);
        const searchKeyword = formData.get('search_keyword');

        try {
            const response = await fetch(`/search_friend?search_keyword=${searchKeyword}`);
            const data = await response.json();

            if (data.find_friend.length > 0) {
                const friendList = data.find_friend.map(friend => `<li><a class="a-list" href="/profile?user_id=${friend.user_id}">${friend.username}</a></li>`).join('');
                findFriendsDiv.innerHTML = `<ul>${friendList}</ul>`;
            } else {
                findFriendsDiv.innerHTML = `<p>Ничего не найдено</p>`;
            }
        } catch (error) {
            console.error('Ошибка при получении данных:', error);
            findFriendsDiv.innerHTML = `<p>Ошибка при получении данных</p>`;
        }
    });
});

/*document.addEventListener('DOMContentLoaded', function () {
    const searchForm = document.querySelector('.search form');
    const findFriendsDiv = document.getElementById('find-friends');

    searchForm.addEventListener('submit', async function (event) {
        event.preventDefault();

        const formData = new FormData(searchForm);
        const searchKeyword = formData.get('search_keyword');

        try {
            const response = await fetch(`/search_friend?search_keyword=${encodeURIComponent(searchKeyword)}`);

            if (!response.ok) {
                throw new Error('Ошибка при выполнении запроса');
            }

            const data = await response.json();

            if (data.find_friend && data.find_friend.length > 0) {
                const friendList = data.find_friend.map(friend => {
                    const escapedUsername = escapeHTML(friend.username);
                    return `<li><a class="a-list" href="/profile?user_id=${friend.user_id}">${escapedUsername}</a></li>`;
                }).join('');
                findFriendsDiv.innerHTML = `<ul>${friendList}</ul>`;
            } else {
                findFriendsDiv.innerHTML = `<p>Ничего не найдено</p>`;
            }
        } catch (error) {
            console.error('Ошибка при получении данных:', error);
            findFriendsDiv.innerHTML = `<p>Ошибка при получении данных</p>`;
        }
    });
});

//
*/

