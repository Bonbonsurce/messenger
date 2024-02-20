
app.post('/send_message', (req, res) => {
    const receiverId = req.body.receiver_id;
    const senderId = req.body.sender_user_id;
    const textMessage = req.body.text_message;
    console.log(senderId);
    console.log(receiverId);
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