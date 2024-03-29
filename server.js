const https = require('https');
const express = require('express');
const app = express();
const { Pool } = require('pg');
const fs = require('fs');
const hostname = '127.0.0.1';
const port = 3000;
const bodyParser = require('body-parser');
const session = require('express-session');

//эта штука для адекватной обработки POST запросов с клиентской части
app.use(bodyParser.json());

app.use(session({
    secret: 'secret', // Секретный ключ для подписи куки с сессией
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // Установка длительности сессии на 1 день (в миллисекундах)
}));

app.use(express.static(__dirname + '/public'));

const options = {
    key: fs.readFileSync('server.key'),
    cert: fs.readFileSync('server.cert')
};

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'messenger',
    password: 'com4ohCe',
    port: 5432
});

pool.on('connect', () => {
    console.log('Подключение к базе данных успешно!');
});

pool.on('error', (err) => {
    console.error('Ошибка подключения к базе данных:', err);
});

app.use(bodyParser.urlencoded({ extended: true }));
//const newsRoute = require('./routes/rout_news');

app.get('/', (req, res) => {
    const filePath = __dirname + '/public/templates/index.html';
    res.sendFile(filePath);
});

app.get('/friends', (req, res) => {
    // Проверяем, аутентифицирован ли пользователь
    if (req.session.authenticated) {
        fs.readFile(__dirname + '/public/templates/friends/friends.html', 'utf8', (err, data) => {
            // Заменяем значение session_user_id в HTML-файле на значение из сессии
            const updatedData = data.replace(/<%= session_user_id %>/g, req.session.userId);

            // Отправляем обновленный HTML-файл клиенту
            res.send(updatedData);
        })
        //res.sendFile(__dirname + '/public/templates/messages/message.html', { session_user_id: req.session.userId });

    } else {
        // Если пользователь не аутентифицирован, перенаправляем его на страницу авторизации
        res.redirect('/welcome');
    }
});

app.get('/friends_info', async (req, res) => {
    //follower_id - тот кто подписан
    //following_id - тот на кого подписан
    try {
        // Выполнение запросов к базе данных
        const query_follows = await pool.query({
            text: `SELECT username, following_id
                   FROM followers
                   JOIN users ON followers.following_id = users.user_id
                   WHERE followers.follower_id = $1`,
            values: [req.session.userId]
        });

        const query_followers = await pool.query({
            text: `SELECT username, follower_id
                   FROM followers
                   JOIN users ON followers.follower_id = users.user_id
                   WHERE followers.following_id = $1`,
            values: [req.session.userId]
        });

        const query_friends = await pool.query({
            text: `SELECT username, user_id_2
                   FROM friends
                   JOIN users ON friends.user_id_2 = users.user_id
                   WHERE friends.user_id_1 = $1`,
            values: [req.session.userId]
        });

        // Отправка данных клиенту
        res.json({
            follows: query_follows.rows,
            followers: query_followers.rows,
            friends: query_friends.rows
        });
    } catch (error) {
        console.error('Ошибка при выполнении запросов:', error);
        res.status(500).json({ error: 'Ошибка при получении информации о друзьях' });
    }
});

app.get('/search_friend', async (req, res) => {
    const currentUserId = req.session.userId;
    console.log(currentUserId);
    try {
        const search_name = req.query.search_keyword;
        // Запрос к базе данных
        const find_friends = await pool.query({
            text: 'SELECT username, user_id FROM users WHERE username ILIKE $1 AND user_id != $2',
            values: [`%${search_name}%`, currentUserId],
        });

        res.json({
            find_friend: find_friends.rows
        });
    } catch (error) {
        console.error('Ошибка при выполнении запросов:', error);
        res.status(500).json({ error: 'Ошибка при получении информации о друзьях' });
    }
});

app.get('/welcome', (req, res) => {
    // Проверяем, аутентифицирован ли пользователь
    if (req.session.authenticated) {
        // Если пользователь уже аутентифицирован, перенаправляем его на страницу новостей
        res.redirect('/news');
    } else {
        // Если пользователь не аутентифицирован, показываем страницу авторизации
        const filePath = __dirname + '/public/templates/authentication/authentication.html';
        res.sendFile(filePath);
    }
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;

    // Запрос к базе данных для поиска пользователя с указанным именем пользователя
    const query = {
        text: 'SELECT * FROM users WHERE username = $1',
        values: [username]
    };

    pool.query(query, (err, result) => {
        if (err) {
            console.error('Ошибка при выполнении запроса:', err);
            res.status(500).send('Ошибка при выполнении запроса');
            return;
        }

        if (result.rows.length === 0) {
            // Если пользователь с указанным именем пользователя не найден
            res.status(401).send('Неправильное имя пользователя или пароль');
            return;
        }

        const user = result.rows[0];
        // Здесь вы можете сравнить хэш пароля из базы данных с введенным паролем
        if (user.user_password === password) {
            // После успешной аутентификации
            req.session.authenticated = true; // Устанавливаем флаг успешной аутентификации в сессии
            req.session.userId = user.user_id;
            req.session.username = user.username;
            req.session.mail = user.email;
            req.session.profile_info = user.profile_info;
            req.session.user_date = user.registration_date;
            res.redirect('/news');
        } else {
            // Пароли не совпали
            res.status(401).send('Неправильное имя пользователя или пароль');
        }
    });
});

app.get('/write_new', (req, res) => {
    const query = {
        text: 'SELECT username, user_id FROM users WHERE user_id != $1',
        values: [req.session.userId]
    };

    pool.query(query, (err, result) => {
        if (err) {
            res.status(500).send('Ошибка при выполнении запроса');
            return;
        }
        const usernames = result.rows;
        // Отправляем данные в формате JSON обратно клиенту
        res.json({ message: usernames });
    });
});

app.post('/send_message', (req, res) => {
    const receiverId = req.body.receiver_id;
    const senderId = req.body.sender_user_id;
    const textMessage = req.body.text_message;

    const insertQuery = `
        INSERT INTO public.messages(message_text, post_time, sender_id, receiver_id)
        VALUES ($1, NOW(), $2, $3)
    `;
    const values = [textMessage, senderId, receiverId];

    pool.query(insertQuery, values, (error, results) => {
        if (error) {
            console.error('Ошибка выполнения запроса:', error);
            //res.redirect('/message');
            res.status(500).send('Произошла ошибка при выполнении запроса');
        } else {
            console.log('Данные успешно вставлены в базу данных');
            res.redirect(`/message?user_id=${receiverId}`);
            //res.status(200).send('Данные успешно вставлены в базу данных');
        }
    });

});

app.get('/news', (req, res) => {
    // Проверяем, аутентифицирован ли пользователь
    if (req.session.authenticated) {
        // Если пользователь аутентифицирован, показываем страницу новостей
        const filePath = __dirname + '/public/templates/news/news.html';
        res.sendFile(filePath);
    } else {
        // Если пользователь не аутентифицирован, перенаправляем его на страницу авторизации
        res.redirect('/welcome');
    }

    const filePath = __dirname + '/public/templates/news/news.html';
    res.sendFile(filePath);
});

//путь для отображения информации о диалоге с человеком - состоит из текста, кто отправил, кто получил
app.get('/conversation', (req, res) => {
    const idReceiver = req.query.idReceiver;

    req.session.userReceiver = idReceiver;
    const user_send = req.session.userId;
    const user_received = req.session.userReceiver;

    if (!user_send) {
        res.status(401).send('Пользователь не аутентифицирован');
        return;
    }
    const query = {
        text: `
            SELECT m.message_text, m.sender_id, m.receiver_id, u.username
            FROM messages m
            JOIN users u ON m.sender_id = u.user_id
            WHERE (m.sender_id = $1 AND m.receiver_id = $2)
               OR (m.sender_id = $2 AND m.receiver_id = $1);
      `,
        values: [user_send, user_received],
    };

    pool.query(query, (err, result) => {
        if (err) {
            res.status(500).send('Ошибка при выполнении запроса');
            return;
        }
        const messagesConversation = result.rows;

        // Отправляем данные в формате JSON обратно клиенту
        res.json({ messages: messagesConversation });
    });
});

app.get('/all_mes_show', (req, res) => {
    const userId = req.session.userId;
    if (!userId) {
        res.status(401).send('Пользователь не аутентифицирован');
        return;
    }
    const query = {
        text: `
        SELECT DISTINCT users.username, users.user_id
        FROM messages
        JOIN users ON messages.receiver_id = users.user_id
        WHERE messages.sender_id = $1;
      `,
        values: [userId],
    };

    pool.query(query, (err, result) => {
        if (err) {
            res.status(500).send('Ошибка при выполнении запроса');
            return;
        }
        const receiverUsers = result.rows;

        // Отправляем данные в формате JSON обратно клиенту
        res.json({ users: receiverUsers });
    });
});

app.get('/message', (req, res) => {
    // Проверяем, аутентифицирован ли пользователь
    if (req.session.authenticated) {
        fs.readFile(__dirname + '/public/templates/messages/message.html', 'utf8', (err, data) => {
            // Заменяем значение session_user_id в HTML-файле на значение из сессии
            const updatedData = data.replace(/<%= session_user_id %>/g, req.session.userId);

            // Отправляем обновленный HTML-файл клиенту
            res.send(updatedData);
        })
        //res.sendFile(__dirname + '/public/templates/messages/message.html', { session_user_id: req.session.userId });

    } else {
        // Если пользователь не аутентифицирован, перенаправляем его на страницу авторизации
        res.redirect('/welcome');
    }
});

app.get('/profile', (req, res) => {
    // Проверяем, аутентифицирован ли пользователь
    if (req.session.authenticated) {
        const filePath = __dirname + '/public/templates/profile/profile.html';
        res.sendFile(filePath);
    } else {
        // Если пользователь не аутентифицирован, перенаправляем его на страницу авторизации
        res.redirect('/welcome');
    }
});

app.get('/user_info', (req, res) => {
    const userId = req.query.user_id;
    if (userId == -1) {
        const query = {
            text: `SELECT username, email, password_hash, registration_date, profile_info, user_password, logo_img FROM users WHERE user_id = $1`,
            values: [req.session.userId]
        };

        pool.query(query, (err, result) => {
            if (err) {
                res.status(500).send('Ошибка при выполнении запроса');
                return;
            }
            const user = result.rows;
            console.log(user);
            // Отправляем данные в формате JSON обратно клиенту
            res.json({ info: user });
        });
    } else {
        const query = {
            text: `SELECT username, email, password_hash, registration_date, profile_info, user_password, logo_img FROM users WHERE user_id = $1`,
            values: [userId]
        };

        pool.query(query, (err, result) => {
            if (err) {
                res.status(500).send('Ошибка при выполнении запроса');
                return;
            }
            const user = result.rows;
            console.log(user);
            // Отправляем данные в формате JSON обратно клиенту
            res.json({ info: user });
        });
    }
});

app.get('/check_friendship', (req, res) => {
    const userId = req.query.user_id;
    const myUserId = req.session.userId;

    const query = {
        text: `SELECT DISTINCT user_id_1, user_id_2 FROM friends WHERE (user_id_1 = $1 AND user_id_2 = $2) OR (user_id_1 = $2 AND user_id_2 = $1)`,
        values: [myUserId, userId]
    };

    pool.query(query, (err, result) => {
        if (err) {
            res.status(500).json({ error: 'Ошибка при выполнении запроса' });
            return;
        }

        if (result.rows.length > 0) {
            res.json({ friendshipStatus: 'friend' });
        } else {
            res.json({ friendshipStatus: 'not_friend' });
        }
    });
});


app.post('/remove_friend', (req, res) => {
    const friendId = req.body.friendId;

    const query = {
        text: 'DELETE FROM friends WHERE (user_id_1 = $1 AND user_id_2 = $2) OR (user_id_2 = $1 AND user_id_1 = $2)',
        values: [req.session.userId, friendId]
    };

    pool.query(query, (err, result) => {
        if (err) {
            console.error('Ошибка при выполнении запроса:', err); // Логируйте ошибку, если она возникла
            res.status(500).json({ error: 'Ошибка при удалении друга' });
            return;
        }
        res.redirect('/friends');
    });
});

app.post('/add_friend', (req, res) => {
    const friendIdDel = req.body.friendId;
    console.log('Friend ID:', friendIdDel);
    const query = {
        text: 'INSERT INTO friends (user_id_1, user_id_2) VALUES ($1, $2)',
        values: [req.session.userId, friendIdDel]
    };

    pool.query(query, (err, result) => {
        if (err) {
            res.status(500).json({ error: 'Ошибка при добавлении друга' });
            return;
        }
        console.log("heeey");
        res.redirect('/friends');
    });
});

app.post('/register', (req, res) => {
    const { username, email, password, profile_info } = req.body;
    const registration_date = new Date().toISOString();
    const password_hash = generateHash(password); // Генерируйте хэш пароля перед сохранением в базу данных
    const query = {
        text: 'INSERT INTO users(username, email, password_hash, registration_date, profile_info, user_password) VALUES($1, $2, $3, $4, $5, $6)',
        values: [username, email, password_hash, registration_date, profile_info, password]
    };

    pool.query(query, (err, result) => {
        if (err) {
            res.status(500).send('Ошибка при регистрации пользователя');
        } else {
            res.redirect('/welcome');
        }
    });
});

const server = https.createServer(options, app).listen(port, () => {
    console.log(`Server running at https://${hostname}:${port}/`);
});

const crypto = require('crypto');

function generateHash(password) {
    const secretKey = 'message'; // Замените это на ваш секретный ключ
    const hash = crypto.createHmac('sha256', secretKey)
        .update(password)
        .digest('hex');
    return hash;
}