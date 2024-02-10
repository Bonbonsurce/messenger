const express = require('express');
const app = express();
const { Pool } = require('pg');
const fs = require('fs');
const hostname = '127.0.0.1';
const port = 3000;

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


app.get('*', (req, res) => {
    const filePath = __dirname + '/public/templates/index.html';
    res.sendFile(filePath);
});

const server = app.listen(3000, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
});
