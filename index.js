'use strict'
var async = require('async')
var moment = require('moment')
var scrapper = require('./scrapper')
var config = require('./config')

let directions = [
    {name: 'toStPete', fromCity: "МОСКВА", fromCode:2000000, toCity:"САНКТ-ПЕТЕРБУРГ", toCode: 2004000},
    {name: 'toMoscow', fromCity: "САНКТ-ПЕТЕРБУРГ", fromCode:2004000, toCity:"МОСКВА", toCode: 2000000}
]

let startDate = moment(config.STARTDATE, 'DD.MM.YYYY')
let finalDate = moment(startDate).add(config.DAYSTOSCRAP, 'days')

console.log(`-----
Performing scrapping from ${startDate.format('DD.MM.YYYY')} to ${finalDate.format('DD.MM.YYYY')}
for the ${directions.map(dir => `"${dir.name}"`).join(', ')} directions
-----`);

//todo get rid of callback hell!
async.eachSeries(directions, function(direction, directionSeriesCallback){
    let currentDate = moment(startDate)
    console.log(`Starting with ${direction.name} direction`);
    async.whilst(() => currentDate < finalDate,
        (whilstCallback) =>{
            async.series([
                (scrapCallback) => {scrapper.scrapData(currentDate, direction, 
                    function(err){
                        if (!err) scrapCallback(null)
                        else console.error('Scrap failed:', err);
                    })},
                (nextCallback) => {currentDate.add(1, 'day'); nextCallback(null)}  
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



