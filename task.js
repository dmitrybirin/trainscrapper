'use strict'
var async = require('async')
var moment = require('moment')
var scrapper = require('./scrapper')
var logger = require('./logger')

let directions = [
    {name: 'toStPete', fromCity: "МОСКВА", fromCode:2000000, toCity:"САНКТ-ПЕТЕРБУРГ", toCode: 2004000},
    {name: 'toMoscow', fromCity: "САНКТ-ПЕТЕРБУРГ", fromCode:2004000, toCity:"МОСКВА", toCode: 2000000}
]

let startDate = moment()
let finalDate = moment(startDate).add(process.env.DAYSTOCOUNT, 'days')
logger.info(`-----
Performing scrapping from ${startDate.format('DD.MM.YYYY')} to ${finalDate.format('DD.MM.YYYY')}
for the ${directions.map(dir => `"${dir.name}"`).join(', ')} directions
-----`);

//todo get rid of callback hell!
async.eachSeries(directions, function(direction, directionSeriesCallback){
    let currentDate = moment(startDate)
    logger.info(`Starting with ${direction.name} direction`);
    async.whilst(() => currentDate < finalDate,
        (whilstCallback) =>{
            async.series([
                (initCallback) => {
                    logger.info(`Begin to scrap ${currentDate.format('DD.MM.YYYY')}`)
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
                err ? logger.error(`We've got an error, while scraping the ${currentDate}:\n`, err) : whilstCallback(null)
            })
        }, function(err){
            logger.info(`Done for ${direction.name} direction`);
            err ? logger.error(`We've got an error, while changing direction the ${currentDate}:\n`, err) : directionSeriesCallback(null)
        }             
    )
}, function(err){
    if (err) {
        logger.error(err)
    }
    else {
        logger.info(`Successfully scrapped tickets information for ${process.env.DAYSTOCOUNT} days`)
        scrapper.done()
    }
    logger.info("Terminating scrapping task...");
})