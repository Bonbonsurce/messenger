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
    // Здесь обработайте логин и пароль, проверьте их в базе данных и предоставьте доступ при успешной аутентификации
});

app.post('/register', (req, res) => {
    const { username, email, password, profile_info } = req.body;
    const registration_date = new Date().toISOString();
    const password_hash = generateHash(password); // Генерируйте хэш пароля перед сохранением в базу данных
    const query = {
        text: 'INSERT INTO users(username, email, password_hash, registration_date, profile_info) VALUES($1, $2, $3, $4, $5)',
        values: [username, email, password_hash, registration_date, profile_info]
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