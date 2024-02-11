const express = require('express');
const app = express();
const { Pool } = require('pg');
const fs = require('fs');
const hostname = '127.0.0.1';
const port = 3000;
const bodyParser = require('body-parser');

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

app.get('/', (req, res) => {
    const filePath = __dirname + '/public/templates/index.html';
    res.sendFile(filePath);
});


app.get('/welcome', (req, res) => {
    const filePath = __dirname + '/public/templates/authentication/authentication.html';
    res.sendFile(filePath);
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
            res.redirect('/news');
        } else {
            // Пароли не совпали
            res.status(401).send('Неправильное имя пользователя или пароль');
        }
    });
});

app.get('/news', (req, res) => {
    const filePath = __dirname + '/public/templates/news/news.html';
    res.sendFile(filePath);
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
            res.status(200).send('Пользователь успешно зарегистрирован');
        }
    });
});

const server = app.listen(3000, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
});

const crypto = require('crypto');

function generateHash(password) {
    const secretKey = 'message'; // Замените это на ваш секретный ключ
    const hash = crypto.createHmac('sha256', secretKey)
        .update(password)
        .digest('hex');
    return hash;
}