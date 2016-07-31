'use strict'
var async = require('async')

var scrapper = require('./scrapper')
var t = require('./handlers/timeHandler')
var config = ('./config')

let directions = [
    {name: 'toStPete', fromCity: "МОСКВА", fromCode:2000000, toCity:"САНКТ-ПЕТЕРБУРГ", toCode: 2004000},
    {name: 'toMoscow', fromCity: "САНКТ-ПЕТЕРБУРГ", fromCode:2004000, toCity:"МОСКВА", toCode: 2000000}
]

let startDate = t.dateToFormat(new Date())
let finalDate = t.nextDay(startDate.date, config.DAYTOSCRAP)


//todo get rid of callback hell!
async.eachSeries(directions, function(direction, directionSeriesCallback){
    let currentDate = startDate    
    console.log(`Start with ${direction.name} direction`);
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
            console.log(`Done for ${direction.name} direction`);
            if (!err) directionSeriesCallback()
        }             
    )
}, function(err){
    if (!err) scrapper.done()
})



