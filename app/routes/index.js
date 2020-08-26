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


MongoClient.connect('mongodb://127.0.0.1:27017/' , (err, client) => { //Подключение к базе данных и загрузка ручек для обращения к ней
    if (err) throw err;
    console.log("База данных успешно подключена");
    require('../routes/databaseRoutes')(app, client); //Подключение всех ручек из databaseRoutes.js
});


app.use (bodyParser.json ({limit: '50mb', extended: true})) //Запуск библиотек сервером

app.use (bodyParser.urlencoded ({limit: '50mb', extended: true}))

app.use(cors());

app.use(express.json());

app.use(express.static(path.join(__dirname, "public")));

app.use(expressMongoDb('mongodb://127.0.0.1:27017/'));


app.listen(port, "0.0.0.0", () => {
    console.log('Express сервер запущен на порту: ' + port);
});  