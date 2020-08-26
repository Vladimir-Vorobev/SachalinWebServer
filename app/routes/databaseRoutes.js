const crypto = require('crypto');


module.exports = function(app, client) {
    app.post('/api/regUser',function(req,res){ //Получение данных с регистрации +
        email = req.body.email;
        sessionID = req.body.sessionid;
        user = req.body.user;

        const mdb = client.db("userData");
        var collection = mdb.collection("users");
        var collectionI = mdb.collection("sessionID");
        
        collectionI.findOne({email: email}, function(errI, sesData){
            if (errI) throw errI
            
            if (sesData.sessionID == sessionID){
                collection.findOne({email: req.body.email},function(err, result){
                    if (err) throw err;

                    if (result == null){
                        key = crypto.randomBytes(64).toString('hex');
                        var collection = mdb.collection("sessionID");
                        collection.insertOne({email: req.body.email, sessionID: key}, function(err){
                            if (err) throw err;
                        })
            
                        var collection = mdb.collection("users");
                        collection.insertOne(req.body.user, function(err){ //Сохранение информации
                            if (err) throw (err);
                        });
            
                        res.send('Reg succsesful');
                    }
                    else{
                        res.send('Reg Fail');
                    }
                });
            }
            else{
                res.send("310");
            }
        });
    });
    
    app.post('/api/login',function(req,res){ //Получение данных с логина и отправка обратно SessionID +    
        const mdb = client.db("userData");
        var collection = mdb.collection("users");

        console.log(req.body)
        
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

    app.post('/api/getInformation',function(req,res){  //Получение информации о пользователе +
        email = req.body.email;
        sessionID = req.body.sessionid;

        console.log(req.body)

        const mdb = client.db("userData");
        var collection = mdb.collection("users");
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
            }
        });  
    });

    app.post("/api/getUserList",function(req,res){
        email = req.body.email;
        sessionID = req.body.sessionid;

        const mdb = client.db("userData");
        var collection = mdb.collection("users");
        var collectionI = mdb.collection("sessionID");

        collectionI.findOne({email: email}, function(errI, sesData){
            if (errI) throw errI
            
            if (sesData.sessionID == sessionID){
                collection.find().toArray(function(err, list){ 
                    if (err) throw err;
                    
                    resList = []

                    for (i in list){
                        if (list[i].role != admin){
                            resList.push({email: list[i].email,role: list[i].role})
                        }
                    }

                    res.send(resList)
                });
            }
            else{
                res.send("310");
            }
        });
    });
};