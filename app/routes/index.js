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
const mdb = require('../config/db');
const expressMongoDb = require('express-mongo-db');
const multer  = require("multer");
//const library = require('../routes/library');
//const assert = require('assert');
//const url = 'mongodb://localhost:27017';
const port = 3000; //Основной порт сервера

 
var parseJSONdb = new JsonDB(new Config("parseData", true, false, '/')); //БД отпаршенных сайтов
var confCodeJSONdb = new JsonDB(new Config("confirmCode", true, false, '/')); //БД ключей залогиненых пользователей


MongoClient.connect(mdb.url     , (err, client) => { //Подключение к базе данных и загрузка ручек для обращения к ней
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

app.use(expressMongoDb(mdb.url));




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


function dateConverter_A(date){
    month = date.slice(date.indexOf(" ")+1,date.length)

    if (month == "January"){
        month = "01"
    }
    if (month == "February"){
        month = "02"
    }
    if (month == "March"){
        month = "03"
    }
    if (month == "April"){
        month = "04"
    }
    if (month == "May"){
        month = "05"
    }
    if (month == "June"){
        month = "06"
    }
    if (month == "July"){
        month = "07"
    }
    if (month == "August"){
        month = "08"
    }
    if (month == "September"){
        month = "09"
    }
    if (month == "October"){
        month = "10"
    }
    if (month == "November"){
        month = "11"
    }
    if (month == "December"){
        month = "12"
    }

    result = date.slice(0,date.indexOf(" ")) + "." + month

    return result
}


let parseTime = 6000000; //Таймер парсера
setInterval(function(){ //Парсинг сайтов
    
    var url1 = 'https://events.mosedu.ru/';
    var url2 = 'https://events.educom.ru/calendar?onlyActual=false&pageNumber=1&search=&portalIds=14'
    var url3 = 'https://events.educom.ru/calendar?onlyActual=false&pageNumber=1&search=&portalIds=21'
    var url4 = 'http://edu.repetitor-general.ru/articles/moscow-dod2020.php';
    var url5 = 'https://vuzopedia.ru/region/city/59?page=1'
    var url6 = 'https://vuzopedia.ru/region/city/59?page=2'
    var url7 = 'https://vuzopedia.ru/region/city/59?page=3'

    
    parseJSONdb.push('/events/allEvents/it',[],true); //Обнуление базы данных для it
    parseJSONdb.push('/events/allEvents/service',[],true); //Обнуление базы данных для it
    parseJSONdb.push('/events/allEvents/inj',[],true); //Обнуление базы данных для it
    parseJSONdb.push('/events/allEvents/points',[],true);

    
    fetch(url1, { 
        method: 'get'
    })
    .then(response => {
        return response.text()
    })
    .then(body => {
        let counter2 = 0; //Счетчик для заполнения массива
        let counter1 = 3; //Счетчик для прохода по всем кнопкам
    
        let arr = {}; //Проходной массив для всех элементов события
        mainArr = []; //Массив для хранения данных мероприятий
            
        let $ = cheerio.load(body); //Загрузка html кода страницы
    
        while ($('div[id = "events-list-block"] div:nth-child(' + String(counter1) + ') div:nth-child(4)').text() != ''){ //Пока вызванное мероприятие не станет пустым делать
            let dopS = $('div[id = "events-list-block"] div:nth-child(' + String(counter1) + ') div:nth-child(3)').text().slice(15); //Загрузка типа
            dopS = dopS.slice(0,dopS.length-4); //Обрезание
                
            let dopS2 = $('div[id = "events-list-block"] div:nth-child(' + String(counter1) + ') div:nth-child(2) table tbody tr td div').text(); //Загрузка даты и времени

            dopS3 = $('div[id = "events-list-block"] div:nth-child(' + String(counter1) + ') div:nth-child(2) table tbody tr td:nth-child(2) div:nth-child(1)').text();
            dopS3 = dopS3.slice(2);
            dopS3 = dopS3.slice(0,dopS3.indexOf('У'));

            arr = {
                name: $('div[id = "events-list-block"] div:nth-child(' + String(counter1) + ') div:nth-child(4)').text(), //Загрузка названия
                type: dopS,
                date: dateConverter_A(dopS2.slice(0,5)), //Заполнение даты
                time: dopS2.slice(7,20), //Заполнение времени 
                link: $('div[id = "events-list-block"] div:nth-child(' + String(counter1) + ') div').attr("onclick").slice(21), //Заполнение ссылки
                places :dopS3,
                id: '/events/allEvents/it'
            }
    
            mainArr[counter2] = arr; //Добавление мероприятия в список
    
            counter1 +=  1; //Увеличение счетчиков
            counter2 += 1;
    
            arr = ['','','','','']; //Обнуление промежуточного массива  
        }
        
        mainArr = mainArr.concat(parseJSONdb.getData('/events/allEvents/it'))
        parseJSONdb.push('/events/allEvents/it', mainArr, true);  
    })
    .catch(err => {
        console.log(err)
    })
    
    fetch(url2,{
        method: 'get'
    })
    .then(response => {
        return response.text()
    })
    .then(body => {
        let $ = cheerio.load(body);

        counter1 = 1;
        counter2 = 0;
        mainArr = [];

        while($("section.event-card.small-12.grid-x:nth-child(" + String(counter1) + ") div.event-card__content-description-title").text() != ''){
            preName = $("section.event-card.small-12.grid-x:nth-child(" + String(counter1) + ") div.event-card__content-description-title").text();
            preName = preName.slice(13);
            preName = preName.slice(0,preName.indexOf('\n'));
    
            preDate = $("section.event-card.small-12.grid-x:nth-child(" + String(counter1) + ") div.event-card__date-date.cell.auto.grid-y.align-center-middle").text();
            preDate_num = preDate.slice(0,preDate.indexOf("\n"));
            preDate = preDate.slice(6);
            while(preDate.indexOf(' ') == 0){
                preDate = preDate.slice(1,preDate.length);
            };
    
            preTime = $("section.event-card.small-12.grid-x:nth-child(" + String(counter1) + ") div.event-card__date-time.small-2.grid-y.align-center-middle").text();
            preTime = preTime.slice(9);
            preTime = preTime.slice(0,preTime.indexOf('\n'));
    
            preLink = $("section.event-card.small-12.grid-x:nth-child(" + String(counter1) + ") div.event-card__content-description-title a").attr('href');
    
            prePlaces = $("section.event-card.small-12.grid-x:nth-child(" + String(counter1) + ") div.event-card__content-image-stat.grid-x.align-spaced.align-bottom div:nth-child(2)").text();
            prePlaces = prePlaces.slice(15);
            prePlaces = prePlaces.slice(0,prePlaces.indexOf('\n'));
    
            arr = {
                name: preName,
                date: dateConverter_A(preDate_num + ' ' + preDate),
                time: preTime,
                type: "Суббота московского школьника",
                link: "https://events.educom.ru" + preLink,
                places: prePlaces,
                id: '/events/allEvents/it'
            };

            mainArr[counter2] = arr;

            counter1 ++;
            counter2 ++;
        }

        mainArr = mainArr.concat(parseJSONdb.getData('/events/allEvents/it'));
        parseJSONdb.push('/events/allEvents/it',mainArr);
    })
    .catch(err => {
        console.log(err)
    }) 

    fetch(url3,{
        method: 'get'
    })
    .then(response => {
        return response.text()
    })
    .then(body => {
        let $ = cheerio.load(body);

        counter1 = 1;
        counter2 = 0;
        mainArr = [];

        while($("section.event-card.small-12.grid-x:nth-child(" + String(counter1) + ") div.event-card__content-description-title").text() != ''){
            preName = $("section.event-card.small-12.grid-x:nth-child(" + String(counter1) + ") div.event-card__content-description-title").text();
            preName = preName.slice(13);
            preName = preName.slice(0,preName.indexOf('\n'));
    
            preDate = $("section.event-card.small-12.grid-x:nth-child(" + String(counter1) + ") div.event-card__date-date.cell.auto.grid-y.align-center-middle").text();
            preDate_num = preDate.slice(0,preDate.indexOf("\n"));
            preDate = preDate.slice(6);
            while(preDate.indexOf(' ') == 0){
                preDate = preDate.slice(1,preDate.length);
            };
    
            preTime = $("section.event-card.small-12.grid-x:nth-child(" + String(counter1) + ") div.event-card__date-time.small-2.grid-y.align-center-middle").text();
            preTime = preTime.slice(9);
            preTime = preTime.slice(0,preTime.indexOf('\n'));
    
            preLink = $("section.event-card.small-12.grid-x:nth-child(" + String(counter1) + ") div.event-card__content-description-title a").attr('href');
    
            prePlaces = $("section.event-card.small-12.grid-x:nth-child(" + String(counter1) + ") div.event-card__content-image-stat.grid-x.align-spaced.align-bottom div:nth-child(2)").text();
            prePlaces = prePlaces.slice(15);
            prePlaces = prePlaces.slice(0,prePlaces.indexOf('\n'));
    
            arr = {
                name: preName,
                date: dateConverter_A(preDate_num + ' ' + preDate),
                time: preTime,
                type: "Суббота московского школьника",
                link: "https://events.educom.ru" + preLink,
                places: prePlaces,
                id: '/events/allEvents/inj'
            };

            mainArr[counter2] = arr;

            counter1 ++;
            counter2 ++;
        }

        mainArr = mainArr.concat(parseJSONdb.getData('/events/allEvents/inj'));
        parseJSONdb.push('/events/allEvents/inj',mainArr);
        
    })
    .catch(err => {
        console.log(err)
    })

    
    {const data = new URLSearchParams();
    data.append('debug', '1');
    data.append('api_ver', '9');
    data.append('use_test_events', 'true');
    data.append('limitstart', '0');
    data.append('limit', '10');
    data.append('events_type', 'med');
    data.append('list_chunck_size', '0');
    data.append('show_type', 'current');
    data.append('first_run', '1');
    
    fetch('http://classes.events.mosedu.ru/?format=json/', {
            method: 'post',
            body: data,
    })
    .then(response => response.json())
    .then(data => {
        mainArr = [];
        for (var i in data.events){
            preName = data.events[i].title;
            while (preName.indexOf('  ') != -1){
                preName = preName.replace('  ',' ')
            }

            arr = {
                name: preName,
                type: data.events[i].type[0].title,
                date: data.events[i].stamp_event_start.slice(8,10) + '.' + data.events[i].stamp_event_start.slice(5,7),
                time: data.events[i].stamp_event_start.slice(11,16),
                link: 'http://profil.mos.ru/med.html#/modal/' + data.events[i].id,
                places: 'Неограничено',
                id: '/events/allEvents/service'
            }
            mainArr[i] = arr;
        }

        mainArr = mainArr.concat(parseJSONdb.getData('/events/allEvents/service'));
        parseJSONdb.push('/events/allEvents/service',mainArr);
    })
}



    {const data2 = new URLSearchParams();
    data2.append('debug', '1');
    data2.append('api_ver', '9');
    data2.append('use_test_events', 'true');
    data2.append('limitstart', '0');
    data2.append('limit', '10');
    data2.append('events_type', 'inj');
    data2.append('list_chunck_size', '0');
    data2.append('show_type', 'current');
    data2.append('first_run', '1');

    fetch('http://classes.events.mosedu.ru/?format=json/', {
        method: 'post',
        body: data2,
})
.then(response => response.json())
.then(data => {
    mainArr = [];
    for (var i in data.events){
        preName = data.events[i].title;
        while (preName.indexOf('  ') != -1){
            preName = preName.replace('  ',' ')
        }

        arr = {
            name: preName,
            type: data.events[i].type[0].title,
            date: data.events[i].stamp_event_start.slice(8,10) + '.' + data.events[i].stamp_event_start.slice(5,7),
            time: data.events[i].stamp_event_start.slice(11,16),
            link: 'http://profil.mos.ru/inj.html#/modal/' + data.events[i].id,
            places: 'Неограничено',
            id: '/events/allEvents/inj'
        }
        mainArr[i] = arr;
    }

    mainArr = mainArr.concat(parseJSONdb.getData('/events/allEvents/inj'));
    parseJSONdb.push('/events/allEvents/inj',mainArr);
    
})
}

fetch(url4, { 
    method: 'get',
    headers: {'Cookie': 'beget=begetok; top100_id=t1.-1.1666596121.1590130488298; last_visit=1590122159434::1590132959434; tmr_reqNum=28; tmr_lvid=93f2f8e0179189848b227321de314ea5; tmr_lvidTS=1590130489260; _ym_uid=1590130489443198407; _ym_d=1590130489; __gads=ID=e6c8c1576719e4f5:T=1590130488:S=ALNI_MZf5CEdKAPLa_up97zHr-6y81Kl4A; _ga=GA1.2.1162348871.1590130489; _gid=GA1.2.715769474.1590130489; _ym_isad=2; tmr_detect=0%7C1590132964884; _gat=1'}
})
.then(response => {
    return response.text()
})
.then(body => {
    var $ = cheerio.load(body);
        counter = 1
        counter2 = 0;
        mainArr = []

        while(counter2 != 15){
            arr = {
                name: $('div.row div.col-md-6.col-sm-6:nth-child(' + String(counter) + ') figcaption.mu-blog-caption a').text(),
                date: $('div.row div.col-md-6.col-sm-6:nth-child(' + String(counter) + ') div.mu-blog-meta a.redd').text(),
                time: $('div.row div.col-md-6.col-sm-6:nth-child(' + String(counter) + ') div.mu-blog-meta span').text().slice(7),
                type: "День открытых дверей",
                link: $('div.row div.col-md-6.col-sm-6:nth-child(' + String(counter) + ') figcaption.mu-blog-caption a').attr('href')
            }

            if (arr.name != ''){
                mainArr[counter2] = arr;
                counter2++;
            }         
            counter++;   
        }
        parseJSONdb.push('/events/allEvents/openDays',mainArr)
})
.catch(err => {
    console.log(err)
})


fetch(url5, { 
    method: 'get',
    //headers: {'Cookie': 'beget=begetok; top100_id=t1.-1.1666596121.1590130488298; last_visit=1590122159434::1590132959434; tmr_reqNum=28; tmr_lvid=93f2f8e0179189848b227321de314ea5; tmr_lvidTS=1590130489260; _ym_uid=1590130489443198407; _ym_d=1590130489; __gads=ID=e6c8c1576719e4f5:T=1590130488:S=ALNI_MZf5CEdKAPLa_up97zHr-6y81Kl4A; _ga=GA1.2.1162348871.1590130489; _gid=GA1.2.715769474.1590130489; _ym_isad=2; tmr_detect=0%7C1590132964884; _gat=1'}
})
.then(response => {
    return response.text()
})
.then(body => {
    var $ = cheerio.load(body);

    mainArr = [];
    counter = 5;
    counter2 = 0;

    while(counter2 < 19){




        prePrice = $('div.sideContent div:nth-child(' + String(counter)  +') div.col-md-5:nth-child(2) div.col-md-4.info:nth-child(1) a.tooltipq').text();
        preName = $('div.sideContent div:nth-child(' + String(counter)  +') div.itemVuzTitle').text().slice(17);
        preMin = $('div.sideContent div:nth-child(' + String(counter)  +') div.col-md-5:nth-child(2) div.col-md-4.info:nth-child(2) a.tooltipq').text();
        preMin = preMin.slice(3,preMin.indexOf('м'));
        if (preMin == ''){
            preMin = '-'
        };
        preMax = $('div.sideContent div:nth-child(' + String(counter)  +') div.col-md-5:nth-child(2) div.col-md-4.info:nth-child(3) a.tooltipq').text();
        preMax = preMax.slice(3,preMax.indexOf('м'));
        if (preMax == ''){
            preMax = '-'
        };

        if (counter2 >3){
            preName = preName.slice(8);
        }

        arr = {
            name: preName.slice(0,preName.indexOf('\n')),
            price: prePrice.slice(3,prePrice.indexOf('⃏')-1),
            min: preMin,
            max: preMax
        };


        mainArr[counter2] = arr;
        counter+=3;
        counter2++;
    };

    mainArr = mainArr.concat(parseJSONdb.getData('/events/allEvents/points'));
    parseJSONdb.push('/events/allEvents/points',mainArr)
})
.catch(err => {
    console.log(err)
})

fetch(url6, { 
    method: 'get',
    //headers: {'Cookie': 'beget=begetok; top100_id=t1.-1.1666596121.1590130488298; last_visit=1590122159434::1590132959434; tmr_reqNum=28; tmr_lvid=93f2f8e0179189848b227321de314ea5; tmr_lvidTS=1590130489260; _ym_uid=1590130489443198407; _ym_d=1590130489; __gads=ID=e6c8c1576719e4f5:T=1590130488:S=ALNI_MZf5CEdKAPLa_up97zHr-6y81Kl4A; _ga=GA1.2.1162348871.1590130489; _gid=GA1.2.715769474.1590130489; _ym_isad=2; tmr_detect=0%7C1590132964884; _gat=1'}
})
.then(response => {
    return response.text()
})
.then(body => {
    var $ = cheerio.load(body);

    mainArr = [];
    counter = 5;
    counter2 = 0;

    while(counter2 < 15){
        prePrice = $('div.sideContent div:nth-child(' + String(counter)  +') div.col-md-5:nth-child(2) div.col-md-4.info:nth-child(1) a.tooltipq').text();
        preName = $('div.sideContent div:nth-child(' + String(counter)  +') div.itemVuzTitle').text().slice(17);
        preMin = $('div.sideContent div:nth-child(' + String(counter)  +') div.col-md-5:nth-child(2) div.col-md-4.info:nth-child(2) a.tooltipq').text();
        preMin = preMin.slice(3,preMin.indexOf('м'));
        if (preMin == ''){
            preMin = '-'
        };
        preMax = $('div.sideContent div:nth-child(' + String(counter)  +') div.col-md-5:nth-child(2) div.col-md-4.info:nth-child(3) a.tooltipq').text();
        preMax = preMax.slice(3,preMax.indexOf('м'));
        if (preMax == ''){
            preMax = '-'
        };

        
        preName = preName.slice(8);
        

        arr = {
            name: preName.slice(0,preName.indexOf('\n')),
            price: prePrice.slice(3,prePrice.indexOf('⃏')-1),
            min: preMin,
            max: preMax
        };


        mainArr[counter2] = arr;
        counter+=3;
        counter2++;
    };


    mainArr = mainArr.concat(parseJSONdb.getData('/events/allEvents/points'));
    parseJSONdb.push('/events/allEvents/points',mainArr)
})
.catch(err => {
    console.log(err)
})


fetch(url7, { 
    method: 'get',
    //headers: {'Cookie': 'beget=begetok; top100_id=t1.-1.1666596121.1590130488298; last_visit=1590122159434::1590132959434; tmr_reqNum=28; tmr_lvid=93f2f8e0179189848b227321de314ea5; tmr_lvidTS=1590130489260; _ym_uid=1590130489443198407; _ym_d=1590130489; __gads=ID=e6c8c1576719e4f5:T=1590130488:S=ALNI_MZf5CEdKAPLa_up97zHr-6y81Kl4A; _ga=GA1.2.1162348871.1590130489; _gid=GA1.2.715769474.1590130489; _ym_isad=2; tmr_detect=0%7C1590132964884; _gat=1'}
})
.then(response => {
    return response.text()
})
.then(body => {
    var $ = cheerio.load(body);

    mainArr = [];
    counter = 5;
    counter2 = 0;

    while(counter2 < 15){
        prePrice = $('div.sideContent div:nth-child(' + String(counter)  +') div.col-md-5:nth-child(2) div.col-md-4.info:nth-child(1) a.tooltipq').text();
        preName = $('div.sideContent div:nth-child(' + String(counter)  +') div.itemVuzTitle').text().slice(17);
        preMin = $('div.sideContent div:nth-child(' + String(counter)  +') div.col-md-5:nth-child(2) div.col-md-4.info:nth-child(2) a.tooltipq').text();
        preMin = preMin.slice(3,preMin.indexOf('м'));
        if (preMin == ''){
            preMin = '-'
        };
        preMax = $('div.sideContent div:nth-child(' + String(counter)  +') div.col-md-5:nth-child(2) div.col-md-4.info:nth-child(3) a.tooltipq').text();
        preMax = preMax.slice(3,preMax.indexOf('м'));
        if (preMax == ''){
            preMax = '-'
        };

        
        preName = preName.slice(8);
        

        arr = {
            name: preName.slice(0,preName.indexOf('\n')),
            price: prePrice.slice(3,prePrice.indexOf('⃏')-1),
            min: preMin,
            max: preMax
        };


        mainArr[counter2] = arr;
        counter+=3;
        counter2++;
    };


    mainArr = mainArr.concat(parseJSONdb.getData('/events/allEvents/points'));
    parseJSONdb.push('/events/allEvents/points',mainArr)
})
.catch(err => {
    console.log(err)
})

}, parseTime);


app.listen(port, () => {
    console.log('Express сервер запущен на порту: ' + port);
});     