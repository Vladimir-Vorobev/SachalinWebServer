const {JsonDB} = require('node-json-db');
const {Config} = require('node-json-db/dist/lib/JsonDBConfig');
const library = require('../routes/library');
const nodemailer = require('nodemailer');
const needle = require('needle');
const { ObjectID } = require('bson');
const { ResumeToken } = require('mongodb');
const { count } = require('console');
var server = require('http').createServer(); //Создание сервера для сокетов
var io = require('socket.io')(server);


var parseJSONdb = new JsonDB(new Config("parseData", true, false, '/')); //БД отпаршенных сайтов


let transporter = nodemailer.createTransport({ //Создание почтового бота
    service: 'gmail',
    auth: {
        user: 'noreplyprofevents@gmail.com',
        pass: 'QETUOADGJLZCBM13579*'
    }
})


module.exports = function(app, client) {
    let users = {}
    io.sockets.on('connection', function(socket){ //Соединение сокетов
        console.log("Новый пользователь")
        socket.on('error', (err) => {
            console.log(err)
        });
        socket.on('new_user', (data) => {
            users[data] = socket
        })
        socket.on('recon', (data) => {
            users[data] = socket
        });
    })


    let mailingTime = 3600000; //Таймер рассылки напоминаний

        setInterval(function(){ //Напоминание о мероприятиях
        const mdb = client.db("userData");
        var collection = mdb.collection("checkedEvents");

        collection.find().toArray(function(err, users){
            if (err) throw (err);

            var date = new Date();
            time = date.getHours();
            date = date.getDate();
            
            for (var key in users){
                for (var i in users[key].checkedEvents){
                    if (((Number(users[key].checkedEvents[i].time.slice(0,2) - time)) == 1) && (Number(users[key].checkedEvents[i].date.slice(0,2)) == date)){
                        transporter.sendMail({
                            from: '"no-reply_ProfEvents" <noreplyprofevents@gmail.com>',
                            to: users[key].email,
                            subject: "Напоминание о мероприятие",
                            text: 'Внимание! До мероприятия "' + users[key].checkedEvents[i].name + '", на которое Вы зарегистрировались, остался один час.\nСсылка на мероприятие: ' + users[key].checkedEvents[i].link,
                        })
                    }
                }
            }
        });
    }, mailingTime);


    app.post('/api/getAllEvents',function(req,res){ //Отдача всех мероприятий +
        email = req.body.email;
        sessionID = req.body.sessionid;

        const mdb = client.db("userData");
        var collection = mdb.collection("checkedEvents");
        var collectionI = mdb.collection("sessionID");

        collectionI.findOne({email: email}, function(errI, sesData){
            if (errI) throw errI
            
            if (sesData.sessionID == sessionID){
                it = parseJSONdb.getData('/events/allEvents/it');
                service = parseJSONdb.getData('/events/allEvents/service');
                inj = parseJSONdb.getData('/events/allEvents/inj');

                collection.findOne({email: email},function(err, events){
                    if (err) throw err;

                    for (i in events.checkedEvents){
                        for (counter in it){
                            console.log(events.checkedEvents[i].data.name,it[counter].name)
                            if (events.checkedEvents[i].data.name == it[counter].name){
                                it.splice(counter,1);
                            }
                        }

                        for (counter in service){
                            if (events.checkedEvents[i].data.name == service[counter].name){
                                service.splice(counter,1);
                            }
                        }

                        for (counter in inj){
                            if (events.checkedEvents[i].data.name == inj[counter].name){
                                inj.splice(counter,1);
                            }
                        }
                    }
                });

                openDays = parseJSONdb.getData('/events/allEvents/openDays');
                point = parseJSONdb.getData('/events/allEvents/points');
                
                all = it.concat(service,inj);

                res.send({engineering: inj, service: service, programming: it,allE: all,open: openDays,points: point});
            }
            else{
                res.send("310");
                needle.post('http://78.155.219.12:3000/api/alertEmail', {err: "310", email: email}, function(err){
                    if (err) throw (err);
                });
            }
        });
    });

    app.post('/api/alertEmail',function(req,res){ //Рассылка ошибок
        if (req.body.err == "310"){
            transporter.sendMail({
                from: '"no-reply_ProfEvents" <noreplyprofevents@gmail.com>',
                to: req.body.email,
                subject: "Предупреждение о подозрительной активности",
                text: "Кто то пытался зайти в Ваш аккаунт. Если это не вы, то нажмите кнопку ниже",
            })
        }

    });

    app.post('/api/registration',function(req,res){ //Получение данных с регистрации +
        const mdb = client.db("userData");
        var collection = mdb.collection("information");
        
        collection.findOne({email: req.body.email},function(err, result){
            if (err) throw err;

            if (result == null){
                const mdb = client.db("userData");
                var collection = mdb.collection("information");
        
                collection.find().toArray(function(err,data){
                    if (err) throw err;
                    
                    userId = String(data.length); //Задание всех базовых параметров человека

                    user = req.body;
                    user.friends = [];
                    user.statNumber = "Номер еще не создан";
                    user.role = "user";
                    user.tester = false;
                    user.userId = userId;
    
                    key = library.keyGen(); //Генерация начального sessionID
                    var collection = mdb.collection("sessionID");
                    collection.insertOne({email: req.body.email, sessionID: key}, function(err){
                        if (err) throw err;
                    })
    
                    var collection = mdb.collection("information");
                    collection.insertOne(user, function(err){ //Сохранение информации
                        if (err) throw (err);
                    });
    
                    var collection = mdb.collection("checkedEvents"); //Задание начальных параметров списка мероприятий
                    collection.insertOne({checkedEvents: [],email: req.body.email, stat: {service: 0, programming: 0, engineering: 0}, userId: userId, confStat: {service: 0, programming: 0, engineering: 0}}, function(err){
                        if (err) throw (err);
                    });
                    
                    var collection = mdb.collection("avatars");
                    collection.findOne({token: "1"}, function(err,result){
                        if (err) throw err;

                        collection.insertOne({email: req.body.email, data: {file: result.baseAvatar, type: "image/jpeg"}}, function(err){
                            if (err) throw err;
                        });
                    });

    
                    var collection = mdb.collection("portfolios");
                    collection.insertOne({email: req.body.email, data: []}, function(err){
                        if (err) throw err;
                    });

                    res.send('Reg succsesful');
                });
            }
            else{
                res.send('Reg Fail');
            }
        });
    });

    app.post('/api/login',function(req,res){ //Получение данных с логина и отправка обратно SessionID +    
        const mdb = client.db("userData");
        var collection = mdb.collection("information");

        collection.findOne({email: req.body.email}, function(err, data){
            if (err) throw err;


            if (data != null){ //Если пользователь найден
                if (data.password == req.body.password){ //Если пароль правельный
                    var collectionI = mdb.collection("sessionID");
                    collectionI.findOne({email: req.body.email}, function(errI, result){
                        if (errI) throw errI;
                        
                        key = result.sessionID;
                        res.send({sessionid: key, userid: data.userId}); //Отправить ключ клиенту
                    });
                }
                else{
                    res.send('Incorect password');
                }
            }
            else{
                res.send("User undefined")
            }
        });
    });

    app.post('/api/adminLogin',function(req,res){ //Получение данных с логина и отправка обратно SessionID +
        const mdb = client.db("userData");
        var collection = mdb.collection("information");

        collection.findOne({email: req.headers.email}, function(err, data){
            if (err) throw err;

            if (data != null){
                if (data.password == req.headers.password){
                    res.json(data.role)
                }
                else{
                    res.json('Incorect password');
                }
            }
            else{
                res.json('User undefined')
            }    
        });
    });

    app.post('/api/checkedEventsUpdate',function(req,res){ //Сохранение отмеченных мероприятий пользователя +
        email = req.body.email;
        sessionID = req.body.sessionid;

        const mdb = client.db("userData");
        var collection = mdb.collection("checkedEvents");
        var collectionI = mdb.collection("sessionID");

        collectionI.findOne({email: email}, function(errI, sesData){ //Подгрузка sessionID
            if (errI) throw errI
            
            if (sesData.sessionID == sessionID){ //Проверка правельности sessionID
                
                collection.findOne({email: email}, function(err, result){
                    if (err) throw err;

                    stats = result.stat; //Статистика по количеству мероприятий

                    result = result.checkedEvents; //Добавление отмеченого мероприятия ко всему списк

                    if (result.length == library.deleteRep(result).length){ //Проверка на дупликат для обновления статистики
                        stats[req.body.events.mainType] += 1;
                    }
                   
                    req.body.events = {data: req.body.events, status: "not_checked", moderImg: []}; //Базовые параметры мероприятия

                    result = result.concat(req.body.events);
                    result = library.deleteRep(result); //Удаление дупликатов мероприятий


                    collection.updateOne({email: email}, {$set: {stat: stats}},function(err){ //Обновлние общей статистики мероприятий
                        if (err) throw err;
                    });
                    
                    collection.updateOne({email: email}, {$set: {checkedEvents: result}}, function(err){ //Обновление мероприятий пользователя
                        if (err){throw err}
                        else{
                            res.send('Save succsesful');
                        }
                    });
                });
            }
            else{
                res.send("310");
                needle.post('http://78.155.219.12:3000/api/alertEmail', {err: "310", email: email}, function(err){
                    if (err) throw (err);
                });
            }
        });
    });
            
    app.get('/api/getCheckedEvents',function(req,res){  //Отдача отмеченных мероприятий +
        studEmail = req.headers.studemail; //Получение всевозможных почт
        adminEmail = req.headers.adminemail;
        sessionID = req.headers.sessionid

        const mdb = client.db("userData");
        var collection = mdb.collection("checkedEvents");
        var collectionI = mdb.collection("sessionID");

        if (adminEmail == undefined){
            adminEmail = studEmail
        }

        collectionI.findOne({email: adminEmail}, function(errI, sesData){
            if (errI) throw errI;

            if (sesData.sessionID == sessionID){
                collection.findOne({email: studEmail}, function(err, result){
                    if (err) throw err;
                    
                    res.json(result);
                });
            }
            else{
                res.send("310");
                needle.post('http://78.155.219.12:3000/api/alertEmail', {err: "310", email: email}, function(err){
                    if (err) throw (err);
                });
            }
        });
    });
    
    app.post('/api/getInformation',function(req,res){  //Получение информации о пользователе +
        email = req.headers.email;
        sessionID = req.headers.sessionid;

        console.log(email,sessionID)

        const mdb = client.db("userData");
        var collection = mdb.collection("information");
        var collectionI = mdb.collection("sessionID");

        collectionI.findOne({email: email}, function(errI, sesData){
            if (errI) throw errI
            
            if (sesData.sessionID == sessionID){
                collection.findOne({email: email}, function(err, inform){
                    if (err) throw err;
        
                    res.json(inform);
                });
            }
            else{
                res.send("310");
                needle.post('http://78.155.219.12:3000/api/alertEmail', {err: "310", email: email}, function(err){
                    if (err) throw (err);
                });
            }
        });  
    });

    app.post('/api/updateInformation',function(req,res){ //Обновление статистики пользователя + 
        email = req.body.email;
        sessionID = req.body.sessionid;

        const mdb = client.db("userData");
        var collection = mdb.collection("information");
        var collectionI = mdb.collection("sessionID");

        collectionI.findOne({email: email}, function(errI, sesData){
            if (errI) throw errI
            
            if (sesData.sessionID == sessionID){
                collection.findOne({email: email}, function(err, inform){
                    if (err) throw err;
                    
                    if (req.body.update.userId != undefined){
                        collection.findOne({userId: req.body.update.userId},function(err, data){
                            if (err) throw err;

                            if (data == null){
                                inform = Object.assign(inform,req.body.update); //Обновить старую информацию новой
                    
                                collection.updateOne({email: email}, {$set: inform},function(err){
                                    if (err) throw err
                                    
                                    res.send(inform);
                                });
                            }
                            else{
                                res.send("Id Occupied")
                            }
                        });
                    }
                    else{
                        inform = Object.assign(inform,req.body.update); //Обновить старую информацию новой
                    
                        collection.updateOne({email: email}, {$set: inform},function(err){
                            if (err) throw err
                            
                            res.send(inform);
                        });
                    }
                });
            }
            else{
                res.send("310");
                needle.post('http://78.155.219.12:3000/api/alertEmail', {err: "310", email: email}, function(err){
                    if (err) throw (err);
                });
            }
        });
    });

    app.post('/api/deleteEvent',function(req,res){ //Удаление мероприятия +
        email = req.body.email;
        sessionID = req.body.sessionid;

        const mdb = client.db("userData");
        var collection = mdb.collection("checkedEvents");
        var collectionI = mdb.collection("sessionID");

        collectionI.findOne({email: email}, function(errI, sesData){
            if (errI) throw errI
            
            if (sesData.sessionID == sessionID){
                collection.findOne({email: email}, function(err, result){
                    if (err) throw err;
        
                    event = req.body.event; //Мероприятие,которое нужно удалить
                    events = result.checkedEvents; //Все мероприятия
                    
                    is_not_checked = true;
                    
                    for (key in events){ //Перебор всех мероприятий
                        if((events[key].data.name == event.name) && (events[key].data.link == event.link)){ //При совпадении
                            if (events[key].status == "not_checked"){
                                events.splice(key,1); //Удалить мероприятие
                            }
                            else{
                                is_not_checked = false;
                            }
                        }
                    }
        
                    if (is_not_checked){
                        collection.updateOne({email: email}, {$set: {checkedEvents: events}}, function(err){ //Вернуть обновленный список
                            if (err) throw err
    
                            stats = result.stat;
                            stats[event.mainType] -= 1;
            
                            collection.updateOne({email: email}, {$set: {stat: stats}},function(err){ //Обновлние общей статистики мероприятий
                                if (err) throw err;
                            });
            
                            res.send('Delete sucsessful'); 
                        });
                    }
                    else{
                        console.log("BAN")
                    }
                });
            }
            else{
                res.send("310");
                needle.post('http://78.155.219.12:3000/api/alertEmail', {err: "310", email: email}, function(err){
                    if (err) throw (err);
                });
            }
        }); 
    });



    app.post('/api/addFriendCode',function(req,res){ //Добавление кода друга
        email = req.body.email;
        code = req.body.statNumber;

        const mdb = client.db("userData");
        var collection = mdb.collection("information");

        collection.findOne({statNumber: Number(code)}, function(err, result){
            if (err) throw err;

            if (library.sessionTest(req.body.sessionid,email)){
                if (result != null){
                    collection.findOne({email: email}, function(err, data){
                        if (err) throw err;
                        
                        if (data.statNumber != code){
                            fr = data.friends;
                            fr = fr.concat(code);
                            fr = library.deleteRepArr(fr);
                            collection.updateOne({email: email}, {$set: {friends: fr}}, function(err){
                                if (err){throw err}

                                else{
                                    res.send('Save successful');
                                }
                            });
                        }
                        else{
                            res.send('Code not found');
                        }
                    });
                }
                else{
                    res.send('Code not found');
                }
            }
            else{
                res.send("310");
                needle.post('http://78.155.219.12:3000/api/alertEmail', {err: "310", email: email}, function(err){
                    if (err) throw (err);
                });
            }
        });
    });

    app.get('/api/getCodeInformation',function(req,res){ //Получение статистики друзей
        email = req.headers.email;
        
        const mdb = client.db("userData");
        var collectionI = mdb.collection("information");
        var collectionE = mdb.collection("checkedEvents");

        collectionI.findOne({email: email}, function(err, data){
            if (err) throw (err);
            friends = data.friends;
            final = [];

            if (library.sessionTest(req.headers.sessionid,email)){
                collectionI.find().toArray(function(err1, result1){
                    if (err1) throw (err1);
                    collectionE.find().toArray(function(err2, result2){
                        if (err2) throw err2;
                        for (i in result1){
                            for (counter in friends){
                                if (result1[i].statNumber == friends[counter]){
                                    preFinal = result1[i];
                                    for (counter2 in result2){
                                        if (result1[i].email == result2[counter2].email){
                                            preFinal.checkedEvents = result2[counter2].checkedEvents;
                                        }
                                    }
                                    final.push(preFinal);
                                }
                            }  
                        }
                        res.send(final)
                    });     
                });      
            }
            else{
                res.send("310");
                needle.post('http://78.155.219.12:3000/api/alertEmail', {err: "310", email: email}, function(err){
                    if (err) throw (err);
                });
            }
        });
    });



    app.post('/api/uploadTable',function(req,res){ //Обновление данных загруженных из таблицы
        email = req.body.email;
        data =  req.body.data;
        
        const mdb = client.db("userData");
        var collection = mdb.collection("information");
        var collectionR = mdb.collection("information");

        collectionR.findOne({email: email}, function(errR,dataR){
            if (errR) throw errR

            if (dataR.role != "student"){
                collection.findOne({email: email}, function(err1,adminData){
                    if (err1) throw err1;
                    
                    if (adminData.role == "teacher"){
                        function reсursDelete(collection, teacherData, data){
                            collection.findOne({role: "student", school: teacherData.school, class_number: teacherData.class_number, simvol: teacherData.simvol, tester: false},function(err2, user){
                                if (err2) throw err2;
                                
                                counter = false;
                                if (user != null){                            
                                    for (i in data){
                                        if (data[i].email == user.email){
                                            counter = true;
                                        }
                                    }
                                    if (!counter){
                                        user.role = "user";
                                        user.tester = true;
                                        collection.updateOne({email: user.email},{$set: user}, function(err2){
                                            if (err2) throw err2;
                                        });
                                    }
                                    else{
                                        user.tester = true;
                                        collection.updateOne({email: user.email},{$set: user}, function(err2){
                                            if (err2) throw err2;
                                        });
                                    }                            
                                    reсursDelete(collection,teacherData,data);
                                }
                                else{
                                    recursUpdate(collection, teacherData, data);
                                }                 
                            });
                        }
        
                        reсursDelete(collection, adminData, data);
        
                        function recursUpdate(collection, teacherData, data){
                            collection.findOne({email: data[data.length-1].email}, function(err2, user){                    
                                if (err2) throw err2;
                                if (user != null){                    
                                    user.school = teacherData.school;
                                    user.class_number = teacherData.class_number;
                                    user.simvol = teacherData.simvol;
                                    user.name = data[data.length-1].name;
                                    user.surname = data[data.length-1].surname;
                                    user.role = "student";
                                    collection.updateOne({email: user.email},{$set: user},function(err3){
                                        if (err3) throw err3;
                                    });
                                    data.pop();
                                    if (data.length != 0){
                                        recursUpdate(collection,teacherData,data);
                                    }
                                    else{
                                        collection.updateMany(
                                            {tester: true},              
                                            { $set: {tester: false}},     
                                            function(err){
                                                if (err) throw err;
                                            }
                                        );
                                        res.send("OK")
                                    }
                                }
                                else{
                                    collection.updateMany(
                                        {tester: true},              
                                        { $set: {tester: false}},     
                                        function(err){
                                            if (err) throw err;
                                        }
                                    );
                                    res.send('Данная почта не найдена: ' + String(data[data.length-1].email));
                                }
                            })
                        }  
                    }
                    if (adminData.role == "school_admin"){
        
                    }
                });
            }
        });


    });



    app.post('/api/getAdminList',function(req,res){ //Получение определенных списков пользователей из админ-панели
        email = req.headers.email;
        sessionID = req.headers.sessionid;

        console.log(req.headers)

        const mdb = client.db("userData");
        var collection = mdb.collection("information");
        var collectionI = mdb.collection("sessionID");
        var collectionR = mdb.collection("information");

        collectionR.findOne({email: email}, function(errR,dataR){
            if (errR) throw errR

            if (dataR.role != "student"){
                collectionI.findOne({email: email}, function(errI, sesData){
                    if (errI) throw errI
                    
                    if (sesData.sessionID == sessionID){
                        collection.findOne({email: email}, function(err, data){
                            if (err) throw err;
                
                            collection.find().toArray(function(err2, allData){
                                if (err2) throw err2;
                
                                list = [];
                                if ((allData != null) && (data != null)){
                                    if (data.role == 'teacher'){
                                        list = library.getStudents(data,allData);
                                    }
                                    if (data.role == 'school-admin'){
                                        list = library.getTeachers(data,allData);
                                    }
                                }
                                res.send(list);
                            });
                        });
                    }
                    else{
                        res.send("310");
                        needle.post('http://78.155.219.12:3000/api/alertEmail', {err: "310", email: email}, function(err){
                            if (err) throw (err);
                        });
                    }
                });
            }
        });
    });

    app.post('/api/getRating',function(req,res){ //Получение рейтинга учителя и школы
        const mdb = client.db("userData");
        var collectionI = mdb.collection("sessionID");
        var collection = mdb.collection("information");
        var collectionE = mdb.collection("checkedEvents");

        type = req.headers.type;
        email = req.headers.email;
        sessionID = req.headers.sessionid;

        collectionI.findOne({email: email}, function(errI, sesData){
            if (errI) throw errI
            
            if (sesData.sessionID == sessionID){
                if (req.headers.type == "teacher"){
                    collection.findOne({email: email},function(err,teacherData){
                        if (err) throw err;
        
                        collection.find({role: "student",school: teacherData.school, class_number: teacherData.class_number, simvol: teacherData.simvol}).toArray(function(err, data){
                            if (err) throw err;
        
                            function recursFind(arr,final){
                                collectionE.findOne({email: arr[0].email},function(err,result){
                                    if (err) throw err;
        
                                    final.programming += result.confStat.programming
                                    final.engineering += result.confStat.engineering
                                    final.service += result.confStat.service
        
                                    arr.splice(0,1);
        
        
                                    if (arr.length != 0){
                                        recursFind(arr,final)
                                    }
                                    else{   
                                        res.send(final);
                                    }                            
                                });
                            }
        
                            final = {programming: 0, engineering: 0, service: 0}
                            
                            if (data.length != 0){
                                recursFind(data, final)
                            }
                            else{
                                res.send([])
                            }
                        });
                    });
                }
        
                if (req.headers.type == "school"){
        
                    collection.findOne({email: email},function(err,teacherData){
                        if (err) throw err;
        
                        collection.find({role: "student",school: teacherData.school}).toArray(function(err, data){
                            if (err) throw err;
        
                            function recursFind(arr,final){
                                collectionE.findOne({email: arr[0].email},function(err,result){
                                    if (err) throw err;
        
                                    final.programming += result.confStat.programming
                                    final.engineering += result.confStat.engineering
                                    final.service += result.confStat.service
        
                                    arr.splice(0,1);
        
                                    if (arr.length != 0){
                                        recursFind(arr,final)
                                    }
                                    else{   
                                        res.send(final);
                                    }                            
                                });
                            }
        
                            final = {programming: 0, engineering: 0, service: 0}
        
                            if (data.length != 0){
                                recursFind(data,final)
                            }
                            else{   
                                res.send(final);
                            }  
                        });
                    });
                };
        
                if (req.body.type == "student"){
                    collectionE.findOne({email: email}, function(err, result){
                        if (err) throw err;
        
                        res.send(result.confStat)
                    });
                };
        
                if (req.body.type == "studentAll"){
                    collectionE.findOne({email: email}, function(err, result){
                        if (err) throw err;
        
                        res.send(result.stat)
                    });
                };
            }
            else{
                res.send("310");
                needle.post('http://78.155.219.12:3000/api/alertEmail', {err: "310", email: email}, function(err){
                    if (err) throw (err);
                });
            }
        });
    });

    app.post('/api/uploadOne',function(req,res){ //Добавление и удаление учеников по одному
        email = req.body.email;
        data = req.body.data;
        dopType = req.body.doptype;
        type = req.body.type;
        sessionID = req.body.sessionid;


        console.log(req.body)

        const mdb = client.db("userData");
        var collection = mdb.collection("information");
        var collectionI = mdb.collection("sessionID");
        var collectionR = mdb.collection("information");

        collectionR.findOne({email: email}, function(errR,dataR){
            if (errR) throw errR

            if (dataR.role != "student"){
                collectionI.findOne({email: email}, function(errI, sesData){
                    if (errI) throw errI
                    
                    if (sesData.sessionID == sessionID){
                        if (type == "update"){ //Добавление нового человека
                            if (dopType == "student"){
                                collection.findOne({email: email},function(err2,teacherData){
                                    if (err2) throw err2;
                
                                    collection.findOneAndUpdate({email: data.email},{$set: {role: "student", school: teacherData.school, class_number: teacherData.class_number, simvol: teacherData.simvol}},function(err,result){
                                        if (err) throw err;
                        
                                        if (result.value != null){
                                            res.send({res: "OK"})
                                        }
                                        else{
                                            res.send({res: "'User undefined'"})
                                        }
                                    });
                                });
                            }
                            if (dopType == "teacher"){
                                collection.findOne({email: email}, function(err, adminData){
                                    if (err) throw err;
                                    
                                    console.log(email,data.email)
        
                                    collection.findOneAndUpdate({email: data.email},{$set: {role: "teacher", school: adminData.school}},function(err,result){
                                        if (err) throw err;
                        
                                        if (result.value != null){
                                            res.send({res: "OK"})
                                        }
                                        else{
                                            res.send({res: "'User undefined'"})
                                        }
                                    });
                                });
                            }
                            if (dopType == "school-admin"){
                                collection.findOneAndUpdate({email: data.email},{$set: {role: "school-admin", school: data.school}},function(err,result){
                                    if (err) throw err;
                
                                    if (result.value != null){
                                        res.send({res: "OK"})
                                    }
                                    else{
                                        res.send({res: "'User undefined'"})
                                    }
                                });
                            }
                            if (dopType == "admin"){
                                collection.findOneAndUpdate({email: data.email},{$set: {role: "admin"}},function(err,result){
                                    if (err) throw err;
                    
                                    if (result.value != null){
                                        res.send({res: "OK"})
                                    }
                                    else{
                                        res.send({res: "'User undefined'"})
                                    }
                                });
                            }
                        }
                        if (type == "delete"){ //Удаление человека
                            collection.findOneAndUpdate({email: data.email},{$set: {role: "user"}},function(err,result){
                                if (err) throw err;
                
                                if (result != null){
                                    res.send({res: "OK"})
                                }
                                else{
                                    res.send({res: "'User undefined'"})
                                }
                            }); 
                        }
                    }
                    else{
                        res.send("310");
                        needle.post('http://78.155.219.12:3000/api/alertEmail', {err: "310", email: email}, function(err){
                            if (err) throw (err);
                        });
                    }
                });
            }
        });
    });

    app.post('/api/getIdInformation',function(req,res){ //Получение информации по id
        email = req.headers.email;
        sessionID = req.headers.sessionid;

        const mdb = client.db("userData");
        var collection = mdb.collection("information");
        var collectionI = mdb.collection("sessionID");

        collectionI.findOne({email: email}, function(errI, sesData){
            if (errI) throw errI
            
            if (sesData.sessionID == sessionID){
                id = req.headers.id;

                collection.findOne({userId: id}, function(err, inform){
                    if (err) throw err;
        
                    res.json(inform);
                });
            }
            else{
                res.send("310");
                needle.post('http://78.155.219.12:3000/api/alertEmail', {err: "310", email: email}, function(err){
                    if (err) throw (err);
                });
            }
        });
    });

    app.post('/api/getSchoolList',function(req,res){ //Получение списка школ по школьным админам
        email = req.headers.email;
        sessionID = req.headers.sessionid;
        
        const mdb = client.db("userData");
        var collection = mdb.collection("information");
        var collectionI = mdb.collection("sessionID");

        collectionI.findOne({email: email}, function(errI, sesData){
            if (errI) throw errI
            
            if (sesData.sessionID == sessionID){
                collection.find({role: "school-admin"}).toArray(function(err,result){
                    if (err) throw err;
        
                    resArr = [];
        
                    for (i in result){
                        if (resArr.indexOf(result[i].school) == -1){
                            resArr.push(result[i].school);
                        }
                    }
        
                    res.send(resArr);
                });
            }
            else{
                res.send("310");
                needle.post('http://78.155.219.12:3000/api/alertEmail', {err: "310", email: email}, function(err){
                    if (err) throw (err);
                });
            }
        });
    });

    app.post('/api/getListTeacher',function(req,res){ //Отсылание всех учителей школы
        school = req.headers.school;
        email = req.headers.email;
        sessionID = req.headers.sessionid;

        const mdb = client.db("userData");
        var collection = mdb.collection("information");
        var collectionI = mdb.collection("sessionID");

        collectionI.findOne({email: email}, function(errI, sesData){
            if (errI) throw errI
            
            if (sesData.sessionID == sessionID){
                collection.find({school: school, role: "teacher"}).toArray(function(err,teachers){
                    if (err) throw err;

                    collection.find({school: school, role: "school-admin"}).toArray(function(err2,admins){
                        if (err2) throw err2;

                        res.send([teachers,admins]);
                    });
                });
            }
            else{
                res.send("310");
                needle.post('http://78.155.219.12:3000/api/alertEmail', {err: "310", email: email}, function(err){
                    if (err) throw (err);
                });
            }
        }); 
    });

    app.post('/api/getListAdmin',function(req,res){ //Отсылание всех админов проекта
        const mdb = client.db("userData");
        var collection = mdb.collection("information");
        var collectionI = mdb.collection("sessionID");

        email = req.headers.email;
        sessionID = req.headers.sessionid;


        var collectionR = mdb.collection("information");

        collectionR.findOne({email: email}, function(errR,dataR){
            if (errR) throw errR

            if (dataR.role != "student"){
                collectionI.findOne({email: email}, function(errI, sesData){
                    if (errI) throw errI
                    
                    console.log(email,sesData,sessionID)
        
                    if (sesData.sessionID == sessionID){
                        collection.find({role: "admin"}).toArray(function(err, result){
                            if (err) throw err;
                
                            res.send(result);
                        });
                    }
                    else{
                        res.send("310");
                        needle.post('http://78.155.219.12:3000/api/alertEmail', {err: "310", email: email}, function(err){
                            if (err) throw (err);
                        });
                    }
                });
            }
        });
    });

    app.post('/api/uploadAvatar', function(req,res){ //Загрузка аватара +
        email = req.body.email;
        sessionID = req.body.sessionid
        
        const mdb = client.db("userData");
        var collection = mdb.collection("avatars");
        var collectionI = mdb.collection("sessionID");
        
        collectionI.findOne({email: email}, function(errI, sesData){
            if (errI) throw errI
            
            if (sesData.sessionID == sessionID){
                collection.updateOne({email: email}, {$set: {data: req.body.images[0]}},function(err){
                    if (err) throw err;
                    
                    users[req.body.email].emit('add_system_image')
                });
            }
            else{
                res.send("310");
                needle.post('http://78.155.219.12:3000/api/alertEmail', {err: "310", email: email}, function(err){
                    if (err) throw (err);
                });
            }
        }); 
    });

    app.post('/api/getAvatar', function(req,res){ //+
        const mdb = client.db("userData");
        var collection = mdb.collection("avatars");
        var collectionI = mdb.collection("sessionID");

        email = req.headers.email;
        sessionID = req.headers.sessionid;
        dopEmail = req.headers.dopemail;

        if (dopEmail == undefined){
            dopEmail = email
        }

        collectionI.findOne({email: email}, function(errI, sesData){
            if (errI) throw errI
            

            console.log(sesData.sessionID, sessionID)

            if (sesData.sessionID == sessionID){
                collection.findOne({email: dopEmail},function(err,result){
                    if (err) throw err;

                    res.send(result);
                });
            }
            else{
                res.send("310");
                needle.post('http://78.155.219.12:3000/api/alertEmail', {err: "310", email: email}, function(err){
                    if (err) throw (err);
                });
            }
        });    
    });

    app.post('/api/uploadPortfolio', function(req,res){ //+
        const mdb = client.db("userData");
        var collection = mdb.collection("portfolios");
        var collectionI = mdb.collection("sessionID");

        email = req.body.email;
        type = req.body.type;
        sessionID = req.body.sessionid;

        collectionI.findOne({email: email}, function(errI, sesData){
            if (errI) throw errI
            
            if (sesData.sessionID == sessionID){
                if (type == "update"){
                    collection.findOne({email: email}, function(err,data){
                        if (err) throw err;
        
                        data = data.data;
                        for (img in req.body.images){
                            data.push(req.body.images[img])
        
                            collection.updateOne({email: email},{$set: {data: data}},function(err){
                                if (err) throw err;
                                    
                                users[req.body.email].emit('add_system_image')
                            });
                        }
                    });
                    console.log("Портфолио обновлено")
                }
                if (type == "delete"){
                    imgId = req.body.id;
        
                    collection.findOne({email: email}, function(err, result){
                        if (err) throw err;
        
                        for (i in result.data){
                            if (result.data[i].id == imgId){
                                result.data.splice(i,1);
                            }
                        }
        
                        collection.updateOne({email: email}, {$set: {data: result.data}}, function(err){
                            if (err) throw err;
        
                            res.send("OK")
                        });
                    });
                }
            }
            else{
                res.send("310");
                needle.post('http://78.155.219.12:3000/api/alertEmail', {err: "310", email: email}, function(err){
                    if (err) throw (err);
                });
            }
        });    
    });
    
    /*
    app.post('/api/getPortfolio', function(req,res){
        console.log('getPhotos')
        const mdb = client.db("userData");
        var collection = mdb.collection("portfolios");

        email = req.headers.email;
        console.log(email)
        let n = 0
        function get(){
            collection.find({email: email}).skip( n * 5 ).limit( 5 ).toArray(function(err, files){
                if (err) throw err;
                for(counter in files){
                    users[req.headers.email].emit('send_image', files[counter]);
                }
                n += 1;
                if(files.length != 0) get()
            }); 
        };
        get();
    });
    */

    app.post('/api/getPortfolio', function(req,res){ //+
        const mdb = client.db("userData");
        var collection = mdb.collection("portfolios");
        var collectionI = mdb.collection("sessionID");

        sessionID = req.headers.sessionid;
        email = req.headers.email;

        collectionI.findOne({email: email}, function(errI, sesData){
            if (errI) throw errI
            
            if (sesData.sessionID == sessionID){
                collection.findOne({email: email}, function(err, files){
                    if (err) throw err;
        
                    for(counter in files.data){
                        users[req.headers.email].emit('send_image', files.data[counter]);
                    }
                }); 
            }
            else{
                res.send("310");
                needle.post('http://78.155.219.12:3000/api/alertEmail', {err: "310", email: email}, function(err){
                    if (err) throw (err);
                });
            }
        }); 
    });

    app.post('/api/moderateEvent',function(req,res){        
    
        const mdb = client.db("userData");
        var collection = mdb.collection("checkedEvents");
        var collectionI = mdb.collection("sessionID");

        email = req.body.email;
        type = req.body.type;
        sessionID = req.body.sessionid;

        var collectionR = mdb.collection("information");

        console.log(req.body)

        collectionI.findOne({email: email}, function(errI, sesData){
            if (errI) throw errI
            
            if (sesData.sessionID == sessionID){
                if (type == "student"){ //Добавление учеником подтверждений
                    
                    collection.findOne({email: email},function(err1,result){
                        if (err1) throw err1;
                        
                        images = [];
        
                        for (img in req.body.images){
                            images.push(req.body.images[img]);
                            users[req.body.email].emit('add_system_image');
                        }
        
                        for (key in result.checkedEvents){
                            if ((result.checkedEvents[key].data.name == req.body.data.name) && (result.checkedEvents[key].data.link == req.body.data.link)){
                                result.checkedEvents[key].status = "on_moderate";
                                result.checkedEvents[key].moderImg = images;
                            };
                        }
        
                        collection.updateOne({email: email}, {$set: result}, function(err2){
                            if (err2) throw err2;
                        });
                    });
                }
        
                collectionR.findOne({email: email}, function(errR,dataR){
                    if (errR) throw errR
        
                    if (dataR.role != "student"){
                        if (type == "teacher"){ //Подтверждение учителем подтверждения
                            action = req.body.action;
                            studEmail = req.body.studEmail;
                
                            if (action == "confirm"){
                                collection.findOne({email: studEmail},function(err1,result){
                                    if (err1) throw err1;
                                    
                                    for (key in result.checkedEvents){
                                        if ((result.checkedEvents[key].data.name == req.body.data.name) && (result.checkedEvents[key].data.link == req.body.data.link)){
                                            result.checkedEvents[key].status = "checked";
                                            result.checkedEvents[key].moderImg = [];
                                        };
                                    }
                
                                    collection.updateOne({email: studEmail}, {$set: result}, function(err2){
                                        if (err2) throw err2;
                
                                        collection.findOne({email: studEmail}, function(err, final){
                                            if (err) throw err;
                
                                            final.confStat[req.body.data.mainType] += 1;
                
                                            collection.updateOne({email: studEmail}, {$set: {confStat: final.confStat}}, function(err){
                                                if (err) throw err;
                                            });
                                        });
                
                
                                        transporter.sendMail({
                                            from: '"no-reply_ProfEvents" <noreplyprofevents@gmail.com>',
                                            to: studEmail,
                                            subject: "Посещенное вами мероприятие подтверждено",
                                            text: "Учитель подтвердил ваше мероприятие: " + result.checkedEvents[key].data.name
                                        })
                                    });
                                });  
                            }
                            if (action == "dismiss"){
                                collection.findOne({email: studEmail},function(err1,result){
                                    if (err1) throw err1;
                    
                                    for (key in result.checkedEvents){
                                        if ((result.checkedEvents[key].data.name == req.body.data.name) && (result.checkedEvents[key].data.link == req.body.data.link)){
                                            result.checkedEvents[key].status = "not_checked";
                                            result.checkedEvents[key].moderImg = [];
                                        };
                
                                        collection.updateOne({email: studEmail}, {$set: result}, function(err2){
                                            if (err2) throw err2;
                    
                                            transporter.sendMail({
                                                from: '"no-reply_ProfEvents" <noreplyprofevents@gmail.com>',
                                                to: req.body.email,
                                                subject: "Посещенное вами мероприятие отклонено",
                                                text: "Здраствуйте. Учитель отклонил ваше мероприятие: " + result.checkedEvents[key].data.name + ". Загрузите подтверждение повторно, иначе мероприятие не добавится в статистику."
                                            })
                                        });
                                    }
                                });
                            }
                        }
                    }
                });
            }
            else{
                res.send("310");
                needle.post('http://78.155.219.12:3000/api/alertEmail', {err: "310", email: email}, function(err){
                    if (err) throw (err);
                });
            }
        });   
    }); 

    app.post('/api/getModerationList',function(req,res){
        email = req.headers.email;
        sessionID = req.headers.sessionid;

        const mdb = client.db("userData");
        var collection = mdb.collection("information");
        var collectionI = mdb.collection("sessionID");
        var collectionR = mdb.collection("information");

        collectionR.findOne({email: email}, function(errR,dataR){
            if (errR) throw errR

            if (dataR.role != "student"){
                collectionI.findOne({email: email}, function(errI, sesData){
                    if (errI) throw errI
                    
                    if (sesData.sessionID == sessionID){
                        collection.findOne({email: email}, function(err1,teacherData){ //Получение информации учителя
                            if (err1) throw err1;
                            
                            collection.find({school: teacherData.school, class_number: teacherData.class_number, simvol: teacherData.simvol, role: "student"}).toArray(function(err2,result){ //Нахождение всех учеников
                                if(err2) throw err2;

                                var collection = mdb.collection("checkedEvents");
                
                                function recursFind(result,collection,final){ //Получение нужных мероприятий учеников
                                    collection.findOne({email: result[result.length-1].email}, function(err, data){                        
                                        if (err) throw err;
                
                                        preFinal = {email: data.email, name: result[result.length-1].name, surname: result[result.length-1].surname, events: []}
                
                                        for (i in data.checkedEvents){ //Перебор всех мероприятий ученика
                                            if (data.checkedEvents[i].status == "on_moderate"){ //Если статус верный то
                                                preFinal.events.push(data.checkedEvents[i]); //Добавить мероприятие к списку
                                            }
                                        }
                
                                        if (preFinal.events.length > 0){
                                            final.push(preFinal) 
                                        }
                
                                        result.pop(); //Убрать ученика из общего списка
                                        if (result.length != 0){ //Если общий список не пустой то
                                            recursFind(result,collection,final) //Берем следующего ученика
                                        }
                                        else{ //Иначе
                                            res.send(final) //Отправляем результат
                                        }
                                    });
                                }

                                if (result.length != 0){
                                    recursFind(result,collection,[]);
                                }
                                else{
                                    res.send([])
                                }                                
                            });
                        });
                    }
                    else{
                        res.send("310");
                        needle.post('http://78.155.219.12:3000/api/alertEmail', {err: "310", email: email}, function(err){
                            if (err) throw (err);
                        });
                    }
                });
            }
        });
    });


    server.listen(3001, () => {
        console.log('Сокеты подключены на порту 3001');
    });
};