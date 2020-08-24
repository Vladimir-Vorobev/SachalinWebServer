const crypto = require('crypto');
const {JsonDB} = require('node-json-db');
const {Config} = require('node-json-db/dist/lib/JsonDBConfig');

var parseJSONdb = new JsonDB(new Config("parseData", true, false, '/')); //БД отпаршенных сайтов
var sessionidJSONdb = new JsonDB(new Config("SessionKeys", true, false, '/')); //БД ключей залогиненых пользователей


module.exports.deleteRep = function(arr) { // Функция удаления дубликатов объектов
    var newArr = [];
    counter = 0;
    for (var i in arr){
        for (var i2 in newArr){
            if ((newArr[i2].name === arr[i].data.name) && (newArr[i2].date === arr[i].data.date) && (newArr[i2].time === arr[i].data.time)){
                counter ++;
            }
        }
        
        if (counter == 0){
            newArr.push(arr[i])
        }
        counter = 0;
    }
    return newArr;
}

module.exports.deleteRepArr = function(arr) { //Функция удаления дубликатов в массиве
    var newArr = [];
    counter = 0;
    for (var i in arr){
        for (var i2 in newArr){
            if ((newArr[i2] === arr[i])){
                counter ++;
            }
        }
        
        if (counter == 0){
            newArr.push(arr[i])
        }
        counter = 0;
    }
    return newArr;
}

module.exports.keyGen = function(){ //Генератор SessionID
    token = crypto.randomBytes(64).toString('hex');
    return token;
}

module.exports.getStudents = function(data, allData){ //Получение списка учеников определенного учителя
    school = data.school;
    class_number = data.class_number;
    simvol = data.simvol;

    result = []
    for (i in allData){
        if ((allData[i].school == school) && (allData[i].class_number == class_number) && (allData[i].simvol == simvol) && (allData[i].role == 'student')){
            result.push(allData[i])
        }
    }
    result.sort();
    return result;
}

module.exports.getTeachers = function(data,allData){ //Получение списка учителей админом школы
    school = data.school;
    result = []
    for (i in allData){
        if ((allData[i].school == school) && (allData[i].role == 'teacher')){
            result.push(allData[i])
        }
    }
    result.sort();
    return result;
}



