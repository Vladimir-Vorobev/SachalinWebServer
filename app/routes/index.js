//var http = require('http');
//var needle = require('needle');
//var fs = require('fs');
const express = require('express');
const app = express();
const path = require('path');
const bodyParser = require('body-parser');
const cheerio = require('cheerio');
const {JsonDB} = require('node-json-db');
const {Config} = require('node-json-db/dist/lib/JsonDBConfig');
const cors = require('cors');
const fetch = require('node-fetch');
const nodemailer = require('nodemailer');
//const crypto = require('crypto');
const MongoClient = require('mongodb').MongoClient;
const expressMongoDb = require('express-mongo-db');
const multer  = require("multer");
//const library = require('../routes/library');
//const assert = require('assert');
//const url = 'mongodb://localhost:27017';
const port = 3000; //Основной порт сервера

 
var confCodeJSONdb = new JsonDB(new Config("confirmCode", true, false, '/')); //БД ключей залогиненых пользователей


MongoClient.connect('mongodb://127.0.0.1:27017/' , (err, client) => { //Подключение к базе данных и загрузка ручек для обращения к ней
    if (err) throw err;
    console.log("База данных успешно подключена");
    require('../routes/databaseRoutes')(app, client); //Подключение всех ручек из databaseRoutes.js
});




let transporter = nodemailer.createTransport({ //Создание почтового бота
    service: 'gmail',
    auth: {
        user: 'noreplyprofevents@gmail.com',
        pass: 'QETUOADGJLZCBM13579*'
    }
})
console.log("Почтовый бот подключен")


app.use (bodyParser.json ({limit: '50mb', extended: true})) //Запуск библиотек сервером

app.use (bodyParser.urlencoded ({limit: '50mb', extended: true}))

app.use(cors());

app.use(express.json());

app.use(express.static(path.join(__dirname, "public")));

app.use(expressMongoDb('mongodb://127.0.0.1:27017/'));




app.post('/api/mailCheck',function(req,res){ //Отправка на почту кода с подтверждением
    email = req.body.email;
    code = String(Math.round(Math.random()*10)) + String(Math.round(Math.random()*10)) + String(Math.round(Math.random()*10)) + String(Math.round(Math.random()*10)) + String(Math.round(Math.random()*10)) + String(Math.round(Math.random()*10)); 
    confCodeJSONdb.push('/'+email, code)
    transporter.sendMail({
        from: '"no-reply_ProfEvents" <noreplyprofevents@gmail.com>',
        to: email,
        subject: "Код подтверждения",
        text: "Ваш код подтверждения: " + String(code) + "\n\n\n\n\nЕсли это не Вы, то просто проигнорируйте данное письмо",
    })
});

app.post('/api/codeCheck',function(req,res){ //Проверка кода подтверждения
    email = req.body.email;
    code = req.body.code;
    rCode = confCodeJSONdb.getData('/'+email);

    console.log(email,code,rCode)


    if (code == rCode){
        console.log("OK")
        res.send("OK")
    }
    else{
        res.send("Incorect code")
    }
});








app.listen(port, "0.0.0.0", () => {
    console.log('Express сервер запущен на порту: ' + port);
});  