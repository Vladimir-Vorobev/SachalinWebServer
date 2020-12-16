const crypto = require('crypto');

module.exports = function(app, client) {
    app.post("/api/passUpdate", function(req,res){
        email = req.body.email;
        sessionID = req.body.sessionid;
        oldPass = req.body.oldpass;
        newPass = req.body.newpass;

        const mdb = client.db("userData");
        var collection = mdb.collection("users");
        var collectionI = mdb.collection("sessionID");

        collectionI.findOne({email: email}, function(errI, sesData){
            if (errI) throw errI
            
            if (sesData.sessionID == sessionID){
                collection.findOne({email: email}, function(err,result){
                    if (err) throw err;

                    if (result.password == oldPass){
                        collection.updateOne({email: email}, {$set: {password: newPass}}, function(err){
                            if (err) throw err;

                            res.send({data: "OK"})
                        })
                    }
                    else{
                        res.send({data: 'Incorect password'})
                    }
                });
            }
            else{
                res.send({data: "310"});
            }
        });
    });

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
                collection.findOne({email: req.body.user.email},function(err, result){
                    if (err) throw err;

                    if (result == null){
                        key = crypto.randomBytes(64).toString('hex');
                        collectionI.insertOne({email: req.body.user.email, sessionID: key}, function(err){
                            if (err) throw err;
                        })
            
                        collection.insertOne(req.body.user, function(err){ //Сохранение информации
                            if (err) throw (err);
                        });
            
                        res.send({data:'Reg successful'});
                    }
                    else{
                        res.send({data:'Reg Fail'});
                    }
                });
            }
            else{
                res.json("310");
            }
        });
    });

    app.post("/api/delUser",function(req,res){
        email = req.body.email;
        sessionID = req.body.sessionid;
        dopEmail = req.body.dopemail;

        const mdb = client.db("userData");
        var collection = mdb.collection("users");
        var collectionI = mdb.collection("sessionID");

        collectionI.findOne({email: email}, function(errI, sesData){
            if (errI) throw errI
            
            if (sesData.sessionID == sessionID){
                collection.findOne({email: dopEmail},function(err, result){
                    if (err) throw err;

                    if (result != null){
                        collection.deleteOne({email: dopEmail},function(err){
                            if (err) throw err
                            
                            collectionI.deleteOne({email: dopEmail},function(err){
                                if (err) throw err

                                var collectionI = mdb.collection("tables");
                                collectionI.deleteMany({email: dopEmail},function(err){
                                    if (err) throw err
        
                                    res.send({data: "OK"})
                                });
                            });
                        });
                    }   
                    else{
                        res.send({data: "User undefined"})
                    }
                });
            }
            else{
                res.send({data: "310"});
            }
        });

    });

    app.post('/api/login',function(req,res){ //Получение данных с логина и отправка обратно SessionID +    
        const mdb = client.db("userData");
        var collection = mdb.collection("users");
        
        collection.findOne({email: req.body.email}, function(err, data){
            if (err) throw err;


            if (data != null){ //Если пользователь найден
                if (data.password == req.body.password){ //Если пароль правельный
                    var collectionI = mdb.collection("sessionID");
                    collectionI.findOne({email: req.body.email}, function(errI, result){
                        if (errI) throw errI;
                        
                        key = result.sessionID;
                        
                        collection.findOne({email: req.body.email} , fuction(err, userData){
                            if (err) throw err;              
                                 
                            res.send({sessionid: key, userid: data.userId, data: userData}); //Отправить ключ клиенту
                        });
                    });
                }
                else{
                    res.send({data: 'Incorect password'});
                }
            }
            else{
                res.send({data: "User undefined"})
            }
        });
    });

    app.post('/api/getInformation',function(req,res){  //Получение информации о пользователе +
        email = req.body.email;
        sessionID = req.body.sessionid;

        const mdb = client.db("userData");
        var collection = mdb.collection("users");
        var collectionI = mdb.collection("sessionID");

        collectionI.findOne({email: email}, function(errI, sesData){
            if (errI) throw errI
            
            if (sesData.sessionID == sessionID){
                collection.findOne({email: email}, function(err, inform){
                    if (err) throw err;
        
                    res.send(inform);
                });
            }
            else{
                res.send({data: "310"});
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
                        if (list[i].role != "admin"){
                            resList.push({email: list[i].email,role: list[i].role})
                        }
                    }

                    res.send(resList)
                });
            }
            else{
                res.send({data: "310"});
            }
        });
    });

    app.post("/api/saveData",function(req,res){
        email = req.body.email;
        sessionID = req.body.sessionid;
        data = req.body.data;

        const mdb = client.db("userData");
        var collection = mdb.collection("tables");
        var collectionI = mdb.collection("sessionID");

        collectionI.findOne({email: email}, function(errI, sesData){
            if (errI) throw errI
            
            if (sesData.sessionID == sessionID){
                tableId = crypto.randomBytes(64).toString('hex');
                collection.insertOne({data: data, tableid: tableId, email: email}, function(err){
                    if (err) throw err;
    
                    res.send({data: tableId})
                });
            }
            else{
                res.send({data: "310"});
            }
        });
    });

    app.post("/api/deleteData",function(req,res){
        email = req.body.email;
        sessionID = req.body.sessionid;
        tableId = req.body.tableid;

        const mdb = client.db("userData");
        var collection = mdb.collection("tables");
        var collectionI = mdb.collection("sessionID");

        collectionI.findOne({email: email}, function(errI, sesData){
            if (errI) throw errI
            
            if (sesData.sessionID == sessionID){
                collection.deleteOne({email: email, tableid: tableId}, function(err){
                    if (err) throw err;

                    res.send({data: "OK"})
                });
            }
            else{
                res.send({data: "310"});
            }
        });
    });

    app.post("/api/updateData",function(req,res){
        email = req.body.email;
        sessionID = req.body.sessionid;
        tableId = req.body.tableid;
        data = req.body.data;

        const mdb = client.db("userData");
        var collection = mdb.collection("tables");
        var collectionI = mdb.collection("sessionID");

        collectionI.findOne({email: email}, function(errI, sesData){
            if (errI) throw errI
            
            if (sesData.sessionID == sessionID){
                collection.updateOne({email: email, tableid: tableId},{$set: {data: data}}, function(err){
                    if (err) throw err;

                    res.send({data: "OK"})
                });
            }
            else{
                res.send({data: "310"});
            }
        });
    });

    app.post("/api/getData",function(req,res){
        email = req.body.email;
        sessionID = req.body.sessionid;
        tableId = req.body.tableid;

        const mdb = client.db("userData");
        var collection = mdb.collection("tables");
        var collectionI = mdb.collection("sessionID");

        collectionI.findOne({email: email}, function(errI, sesData){
            if (errI) throw errI
            
            if (sesData.sessionID == sessionID){
                collection.findOne({email: email, tableid: tableId}, function(err,result){
                    if (err) throw err;

                    res.json({data: result})
                });
            }
            else{
                res.send({data: "310"});
            }
        });
    });

    app.post("/api/getDataList",function(req,res){
        email = req.body.email;
        sessionID = req.body.sessionid;

        const mdb = client.db("userData");
        var collection = mdb.collection("tables");
        var collectionI = mdb.collection("sessionID");

        collectionI.findOne({email: email}, function(errI, sesData){
            if (errI) throw errI
            
            if (sesData.sessionID == sessionID){
                collection.find({email: email}).toArray(function(err,arr){
                    if (err) throw err;
        
                    res.send({data: arr})
                });
            }
            else{
                res.send({data: "310"});
            }
        });
    });
    
    
    
    app.post("/api/getAllData",function(req,res){
        email = req.body.email;
        sessionID = req.body.sessionid;

        const mdb = client.db("userData");
        var collection = mdb.collection("tables");
        var collectionI = mdb.collection("sessionID");

        collectionI.findOne({email: email}, function(errI, sesData){
            if (errI) throw errI
            
            if (sesData.sessionID == sessionID){
                collection.find().toArray(function(err,arr){
                    if (err) throw err;
        
                    res.send({data: arr})
                });
            }
            else{
                res.send({data: "310"});
            }
        });
    });
};
