const express = require('express');
const router = express.Router();
router.get('/news', (req, res) => {
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

module.exports = router;