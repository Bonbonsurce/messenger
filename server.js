const https = require('https');
const express = require('express');
const app = express();
const { Pool } = require('pg');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid'); //для уникального имени аватарки с session.userId
const hostname = '127.0.0.1';
const port = 3000;
const bodyParser = require('body-parser');
require('dotenv').config();

const session = require('express-session');
const csrf = require('csurf');

//для файловой системы
const multer = require('multer');
const path = require('path');
// Папка для загрузки изображений
const uploadDirectory = path.join(__dirname, 'public', 'pics');

// Создание хранилища multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDirectory);
    },
    filename: function (req, file, cb) {
        //const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        //cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
        const uniqueFileName = `${req.session.userID}-${uuidv4()}${file.originalname.substring(file.originalname.lastIndexOf('.'))}`;
        cb(null, uniqueFileName);
    }
});

// Создание объекта multer
const upload = multer({ storage: storage });


//эта штука для адекватной обработки POST запросов с клиентской части
app.use(bodyParser.json());

app.use(session({
    secret: 'secret', // Секретный ключ для подписи куки с сессией
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // Установка длительности сессии на 1 день (в миллисекундах)
}));

app.use(express.static(__dirname + '/public'));

// Middleware для CSRF токенов
// const csrfProtection = csrf({ cookie: true });
//
// // Применение CSRF токенов ко всем маршрутам
// app.use(csrfProtection);

const options = {
    key: fs.readFileSync('server.key'),
    cert: fs.readFileSync('server.cert')
};

// const pool = new Pool({
//     user: 'postgres',
//     host: 'localhost',
//     database: 'messenger',
//     password: 'com4ohCe',
//     port: 5432
// });
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: 5432
});

/*pool.on('connect', () => {
    console.log('Подключение к базе данных успешно!');
});*/
pool.connect((err, client, done) => {
    if (err) throw err;
    console.log('Connected to PostgreSQL database');

    // Проверка наличия таблицы для хранения сессий
    const checkSessionTableQuery = `
        SELECT EXISTS (
            SELECT 1
            FROM information_schema.tables
            WHERE table_name = 'sessions'
        );
    `;
    client.query(checkSessionTableQuery, (err, result) => {
        if (err) {
            console.error('Error checking session table existence:', err);
            done();
            return;
        }

        const sessionTableExists = result.rows[0].exists;
        if (!sessionTableExists) {
            // Создание таблицы для хранения сессий (если отсутствует)
            const createSessionTableQuery = `
        CREATE TABLE sessions (
          sid VARCHAR NOT NULL PRIMARY KEY,
          sess JSON NOT NULL,
          expire TIMESTAMP(6) NOT NULL
        );
      `;
            client.query(createSessionTableQuery, (err, result) => {
                done();
                if (err) {
                    console.error('Error creating session table:', err);
                } else {
                    console.log('Session table created successfully');
                }
            });
        } else {
            console.log('Session table already exists');
            done();
        }
    });
});

/*
pool.on('error', (err) => {
    console.error('Ошибка подключения к базе данных:', err);
});
*/

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

app.get('/upload_form', (req, res) => {
    const filePath = __dirname + '/public/templates/profile/upload_foto.html';
    res.sendFile(filePath);
});

app.post('/upload_pic', upload.single('image'), async (req, res) => {
    try {
        // Получаем путь к загруженному изображению
        const imagePath = '/pics/' + req.file.filename; // Предполагается, что папка /pics/ уже существует
        console.log(imagePath);

        // Получаем предыдущий путь к фото пользователя из базы данных
        const queryText = 'SELECT logo_img FROM users WHERE user_id = $1';
        const { rows } = await pool.query(queryText, [req.session.userId]);
        const prevImagePath = rows[0] ? rows[0].logo_img.replace('\\', '\\\\') : null;
        const fullImagePath = path.join(__dirname, 'public', prevImagePath);

        console.log(fullImagePath);

        // Обновляем поле user_logo в таблице users для текущего пользователя
        const updateQuery = 'UPDATE users SET logo_img = $1 WHERE user_id = $2';
        const values = [imagePath, req.session.userId];
        await pool.query(updateQuery, values);

        // Удаляем предыдущее фото из файловой системы
        if (fullImagePath) {
            fs.unlink(fullImagePath, (err) => {
                if (err) {
                    console.error('Ошибка при удалении предыдущего изображения:', err);
                } else {
                    console.log('Предыдущее изображение успешно удалено');
                }
            });
        }
        res.redirect('/profile');
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({message: 'Произошла ошибка при загрузке изображения'});
    }
});

app.get('/foto', (req, res) => {
    // Проверяем, аутентифицирован ли пользователь
    if (req.session.authenticated) {
        fs.readFile(__dirname + '/public/templates/foto/foto.html', 'utf8', (err, data) => {
            // Заменяем значение session_user_id в HTML-файле на значение из сессии
            const updatedData = data.replace(/<%= session_user_id %>/g, req.session.userId);

            // Отправляем обновленный HTML-файл клиенту
            res.send(updatedData);
        })

    } else {
        // Если пользователь не аутентифицирован, перенаправляем его на страницу авторизации
        res.redirect('/welcome');
    }
});


app.get('/friends_info', async (req, res) => {
    try {
        // Пакетный запрос к базе данных
        const [followsQuery, followersQuery, friendsQuery] = await Promise.all([
            pool.query({
                text: `SELECT username, following_id
                       FROM followers
                       JOIN users ON followers.following_id = users.user_id
                       WHERE followers.follower_id = $1`,
                values: [req.session.userId]
            }),
            pool.query({
                text: `SELECT username, follower_id
                       FROM followers
                       JOIN users ON followers.follower_id = users.user_id
                       WHERE followers.following_id = $1`,
                values: [req.session.userId]
            }),
            pool.query({
                text: `SELECT username, user_id_2
                       FROM friends
                       JOIN users ON friends.user_id_2 = users.user_id
                       WHERE friends.user_id_1 = $1`,
                values: [req.session.userId]
            })
        ]);

        // Отправка данных клиенту
        res.json({
            follows: followsQuery.rows,
            followers: followersQuery.rows,
            friends: friendsQuery.rows
        });
    } catch (error) {
        console.error('Ошибка при выполнении запросов:', error);
        res.status(500).json({ error: 'Ошибка при получении информации о друзьях' });
    }
});

// Функция обработки ошибок
const handleErrors = (res, error, status = 500) => {
    console.error('Ошибка:', error);
    res.status(status).json({ error: 'Произошла ошибка' });
};

app.get('/search_friend', async (req, res) => {
    const currentUserId = req.session.userId;

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
        handleErrors(res, error);
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
        }
    });

});

app.post('/send_message_chat', (req, res) => {
    const chat_id = req.body.chat_id;
    const sender_id = req.body.sender_id;
    const textMessage = req.body.text_message;

    const insertQuery = `
        INSERT INTO public.chat_messages(message_text, send_time, user_id, chat_id)
        VALUES ($1, NOW(), $2, $3)
    `;
    const values = [textMessage, sender_id, chat_id];

    pool.query(insertQuery, values, (error, results) => {
        if (error) {
            console.error('Ошибка выполнения запроса:', error);
            res.status(500).send('Произошла ошибка при выполнении запроса');
        } else {
            console.log('Данные успешно вставлены в базу данных');
            res.redirect(`/message?chat_id=${chat_id}`);
        }
    });
});

app.post('/create_chat', (req, res) => {
    try {
        const { chatName, participants } = req.body;

        const creator_id = req.session.userId;
        participants.push(creator_id);
        const participantsText = participants.join(', ');

        const query = `
            INSERT INTO chats(chat_name, creator_id, creation_date, members_id)
            VALUES ($1, $2, NOW(), $3)
        `;

        const values = [chatName, creator_id, participantsText];

        pool.query(query, values, (error, results) => {
            if (error) {
                console.error('Ошибка выполнения запроса:', error);
                res.status(500).send('Произошла ошибка при выполнении запроса');
            } else {
                console.log('Данные успешно вставлены в базу данных');
                res.redirect('/message');
            }
        });
    } catch (error) {
        console.error('Ошибка при создании чата:', error);
        // Отправляем ответ с ошибкой клиенту
        res.status(500).json({ error: 'Ошибка при создании чата' });
    }
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

app.post('/delete_dialog', (req, res) => {
    const reciver_id = req.query.user_id;

    const query = {
        text: `
        DELETE FROM public.messages
        WHERE (sender_id = $1 AND receiver_id = $2)
            OR (sender_id = $2 AND receiver_id = $1);
        `, values: [reciver_id, req.session.userId],
    };

    pool.query(query, (err, result) => {
        if (err) {
            res.status(500).send('Ошибка при выполнении запроса');
            return;
        }
        res.redirect('/message');
    });
});

app.post('/delete_chat_member', (req, res) => {
    const chat_id = req.query.chat_id;
    const user_id = req.session.userId;

    // Шаг 1: Удалить пользователя из списка участников чата
    const deleteQuery = {
        text: `
            UPDATE public.chats
            SET members_id = REPLACE(members_id, $1, '')
            WHERE chat_id = $2;
        `,
        values: [user_id, chat_id]
    };

    // Шаг 2: Проверить, остались ли еще участники в чате
    const checkQuery = {
        text: `
            SELECT COUNT(*) AS num_members
            FROM public.chats
            WHERE chat_id = $1
            AND members_id != '';
        `,
        values: [chat_id]
    };

    pool.query(deleteQuery, (err, result) => {
        if (err) {
            res.status(500).send('Ошибка при удалении пользователя из чата');
            return;
        }

        pool.query(checkQuery, (checkErr, checkResult) => {
            if (checkErr) {
                res.status(500).send('Ошибка при проверке оставшихся участников чата');
                return;
            }

            const num_members = checkResult.rows[0].num_members;

            // Если в чате больше нет участников, удалить весь чат
            if (num_members === 0) {
                const deleteChatQuery = {
                    text: `
                        DELETE FROM public.chats
                        WHERE chat_id = $1;
                    `,
                    values: [chat_id]
                };

                pool.query(deleteChatQuery, (deleteChatErr, deleteChatResult) => {
                    if (deleteChatErr) {
                        res.status(500).send('Ошибка при удалении чата');
                        return;
                    }

                    res.send('Пользователь удален из чата, чат удален');
                });
            } else {
                res.send('Пользователь удален из чата');
            }
        });
    });
});

app.get('/add_to_chat', async (req, res) => {
    const chat_id = req.query.chat_id;
    const user_id = req.session.userId;

    try {
        // Выполняем запрос к базе данных
        const {rows} = await pool.query(
            `SELECT u.user_id, u.username
             FROM users u
                      LEFT JOIN (SELECT unnest(string_to_array(members_id, ',')) ::int AS member_id
                                 FROM chats
                                 WHERE chat_id = $1) c ON u.user_id = c.member_id
                      LEFT JOIN friends f ON u.user_id = f.user_id_2
             WHERE c.member_id IS NULL
               AND f.user_id_1 = $2;`,
            [chat_id, user_id]
        );

        // Отправляем результат клиенту
        res.json({friends: rows});
    } catch (error) {
        console.error('Ошибка при выполнении запроса:', error);
        res.status(500).json({error: 'Произошла ошибка при выполнении запроса'});
    }

});

app.post('/add_members_to_chat', async (req, res) => {
    const { chat_id, users } = req.body;

    let string_add = '';
    users.forEach((user, index) => {
        string_add += user.toString(); // Преобразует значение пользователя в строку и добавляет его к строке string_add
        // Проверяем, является ли текущий пользователь последним в массиве
        if (index !== users.length - 1) {
            string_add += ', '; // Добавляем запятую и пробел, если текущий пользователь не последний
        }
    });

    try {
        // Получаем текущих участников чата из базы данных
        const { rows } = await pool.query('SELECT members_id FROM chats WHERE chat_id = $1', [chat_id]);

        const firstRow = rows[0];

        // Получаем значение members_id из первой строки
        const membersId = firstRow.members_id;

        const new_member_id = membersId + ', ' + string_add;

        console.log(new_member_id);

        // Обновляем поле member_id в таблице чатов
        await pool.query('UPDATE chats SET members_id = $1 WHERE chat_id = $2', [new_member_id, chat_id]);


        // Перенаправляем пользователя на страницу /message
        res.redirect('/message');
    } catch (error) {
        console.error('Ошибка при добавлении участников в чат:', error);
        res.status(500).json({ success: false, error: 'Произошла ошибка при добавлении участников в чат' });
    }
});


app.get('/chat_conversation', (req, res) => {
    const chat_Id = req.query.chatId;
    console.log(chat_Id);
    if (!req.session.userId) {
        res.status(401).send('Пользователь не аутентифицирован');
        return;
    }
    const query = {
        text: `
            SELECT cm.chat_id, cm.message_text, cm.send_time, cm.user_id,
                   c.chat_name, c.creator_id, c.creation_date, c.members_id,
                   u.username
            FROM chat_messages cm
                     JOIN chats c ON cm.chat_id = c.chat_id
                     JOIN users u ON cm.user_id = u.user_id
            WHERE c.chat_id = $1;
      `,
        values: [chat_Id],
    };

    pool.query(query, (err, result) => {
        if (err) {
            res.status(500).send('Ошибка при выполнении запроса');
            return;
        }
        const chat_messages = result.rows;
        console.log(chat_messages);
        // Отправляем данные в формате JSON обратно клиенту
        res.json({ chat_messages: chat_messages });
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

    const query2 = {
        text: `
            SELECT DISTINCT chat_name, chat_id
            FROM chats
            WHERE members_id ILIKE $1;
        `,
        values: ['%' + userId + '%'],
    };

    Promise.all([
        pool.query(query),
        pool.query(query2)
    ])
        .then(results => {
            const receiverUsers = results[0].rows;
            const chatNames = results[1].rows;

            // Отправляем данные в формате JSON обратно клиенту
            res.json({ users: receiverUsers, chats: chatNames });
        })
        .catch(error => {
            console.error('Ошибка при выполнении запросов:', error);
            res.status(500).send('Ошибка при выполнении запроса');
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