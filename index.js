'use strict'
var async = require('async')

var scrapper = require('./scrapper')
var t = require('./handlers/timeHandler')

let directions = [
    {name: 'toStPete', fromCity: "МОСКВА", fromCode:2000000, toCity:"САНКТ-ПЕТЕРБУРГ", toCode: 2004000},
    {name: 'toMoscow', fromCity: "САНКТ-ПЕТЕРБУРГ", fromCode:2004000, toCity:"МОСКВА", toCode: 2000000}
]

let currentDate = t.dateToFormat(new Date('08.21.2016'))
let finalDate = t.nextDay(currentDate.date, 2)
let direction = directions[0]

async.whilst(() => currentDate.date < finalDate.date,
    (whilstCallback) =>{
        async.series([
            (scrapCallback) => {scrapper.scrapData(currentDate, direction, 
                function(err){
                    if (!err) scrapCallback(null)
                    else console.error('Scrap failed:', err);
                })},
            (nextCallback) => {currentDate = t.nextDay(currentDate.date, 1); nextCallback(null)}  
        ],function(err){
            if(!err) whilstCallback(null)
        })
    }, function(err){
        scrapper.done()
    }             
)
