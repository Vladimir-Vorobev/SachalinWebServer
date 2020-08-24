const {JsonDB} = require('node-json-db');
const {Config} = require('node-json-db/dist/lib/JsonDBConfig');
const library = require('../routes/library');
const nodemailer = require('nodemailer');
const needle = require('needle');
const { ObjectID } = require('bson');
const { ResumeToken } = require('mongodb');
const { count } = require('console');



let transporter = nodemailer.createTransport({ //Создание почтового бота
    service: 'gmail',
    auth: {
        user: 'noreplyprofevents@gmail.com',
        pass: 'QETUOADGJLZCBM13579*'
    }
})


module.exports = function(app, client) {
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
};