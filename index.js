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
                (initCallback) => {
                    scrapper.init(currentDate, direction, (err)=>{err?initCallback(err):initCallback(null)})
                },
                (checkForCaptchaCallback) =>{
                    scrapper.checkForCaptcha((err)=>{err?checkForCaptchaCallback(err):checkForCaptchaCallback(null)})
                },
                (scrapCallback) => {
                    scrapper.scrapData(currentDate, direction,(err)=> {err ? scrapCallback(err) : scrapCallback(null)})
                },
                (nextCallback) => {
                    currentDate.add(1, 'day')
                    nextCallback(null)
                }
            ],function(err){
                if(!err) whilstCallback(null)
                else console.log("We've got an error, while iterating on days:\n", err);
            })
        }, function(err){
            console.log(`Done for ${direction.name} direction`);
            if (!err) directionSeriesCallback()
        }             
    )
}, function(err){
    if (!err) scrapper.done()
    console.log("Terminating scrapping task...");
})



