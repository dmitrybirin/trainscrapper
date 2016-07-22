'use strict'
var request = require('request');

var db = require('./dbHandler')
var t = require('./timeHandler')

var getTrainsUrl = "https://pass.rzd.ru/timetable/public/ru" 

let directions = [
    {name: 'toStPete', fromCity: "МОСКВА", fromCode:2000000, toCity:"САНКТ-ПЕТЕРБУРГ", toCode: 2004000},
    {name: 'toMoscow', fromCity: "САНКТ-ПЕТЕРБУРГ", fromCode:2004000, toCity:"МОСКВА", toCode: 2000000}
]

function getTrainsData(direction, dateObj, endDateObj){
    if (dateObj.date > endDateObj.date) return;
    
    console.log(direction.name, dateObj.rzdStr);

    var data = {
        STRUCTURE_ID: 735,
        layer_id:5371,
        dir:0,
        tfl:3,
        checkSeats:1,
        st0:direction.fromCity,
        code0:direction.fromCode,
        dt0:dateObj.rzdStr,
        st1:direction.toCity,
        code1:direction.toCode
    }  
    var errCount = 0
    request.get({url: getTrainsUrl, qs:data, jar: true}, (error, response, body) =>{
        data.rid = JSON.parse(body).rid;
        if (!data.rid) setTimeout(function(){
            console.log('RID is undefined, trying to get one more time after 10s...');
            getTrainsData(direction, dateObj, endDate)
        },10000)
        console.log(`Got RID ${data.rid}. Waiting for trains...`);
        setTimeout(function() {
            request.get({url: getTrainsUrl, qs: data, jar: true}, (error, response, body) =>{
                if (!body['result'] === 'OK') console.log('Failed to get trains from RZD on ', dateObj.rzdStr)
                else{
                    var data = JSON.parse(body);
                    console.log(`Got trains from ${direction.fromCity} on ${dateObj.rzdStr}`)
                    if (data && data.tp) {
                        var trains = JSON.parse(body).tp[0]
                        db.addTrainsToDb(direction.name, dateObj.rzdStr, trains)
                        getTrainsData(direction, nextDay(dateObj.date, 1), endDate)
                    }
                    else {
                        if (errCount>3) { console.log('too many errors, logging out...'); return}
                        console.log('Data is undefined, trying to get one more time...');
                        getTrainsData(direction, dateObj, endDate)
                        errCount ++
                    }
                }
            })     
        }, 5000);
    }).on('error',function(err){
        console.log('Oops! Error occured on ', dateObj.rzdStr + ' ', err);
    })
}

// let startDate = t.dateToFormat(new Date) 
let startDate = t.dateToFormat(new Date('08.21.2016'))
let endDate = t.dateToFormat(new Date('09.05.2016'))
// let endDate = t.dateToFormat(new Date('7.13.2016'))

getTrainsData(directions[1], startDate, endDate)



