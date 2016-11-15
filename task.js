'use strict'
var async = require('async')
var moment = require('moment')
var tz = require('moment-timezone')
var scrapper = require('./scrapper')
var logger = require('./logger')
var db = require('./handlers/dbHandler')


const daysToCount = process.argv[2]
if (!daysToCount) {
    console.log("Please, enter the number of days to count as first argument!");
    process.exit(1)
}

let directions = [
    {name: 'toStPete', fromCity: "МОСКВА", fromCode:2000000, toCity:"САНКТ-ПЕТЕРБУРГ", toCode: 2004000},
    {name: 'toMoscow', fromCity: "САНКТ-ПЕТЕРБУРГ", fromCode:2004000, toCity:"МОСКВА", toCode: 2000000}
]
let startDate = moment(tz.tz('Europe/Moscow'))
let finalDate = moment(startDate).add(daysToCount, 'days')
let batchInfo;

db.getTheBatchValue()
.then(function(result){
    batchInfo = {
        id: result,
        timeSlot: getTimeSlot(startDate.hour()),
        scanDate: startDate.format('DD.MM.YYYY'),
        scanTime: startDate.format('HH:mm')
    }
    logger.info(
    `-----
    Performing scrapping from ${startDate.format('DD.MM.YYYY')} to ${finalDate.format('DD.MM.YYYY')}
    for the ${directions.map(dir => `"${dir.name}"`).join(', ')} directions
    batchID # ${batchInfo.id}
    -----`);
    async.eachSeries(directions, scrapingOneDirection, 
    function(err){
        if (err) {
            throw err
        }
        else {
            logger.info(`Successfully scrapped tickets information for ${process.env.DAYSTOCOUNT} days`)
            scrapper.done()
        }
        logger.info("Terminating scrapping task...");
    })
})
.catch(function(err){
    logger.error('The error occured in the task', err)
    scrapper.done()
    process.exit(1)
})

function scrapingOneDirection(direction, directionSeriesCallback){
    let currentDate = moment(startDate)
    logger.info(`Starting with ${direction.name} direction`);
    async.whilst(() => currentDate < finalDate,
        (whilstCallback) =>{
            async.series([
                (scrapCallback) => {
                    scrapper.scrapData(currentDate, direction, batchInfo,
                    (err)=> {logger.debug('task: Scraping data completed.');err ? scrapCallback(err) : scrapCallback(null)})
                },
                (nextCallback) => {
                    currentDate.add(1, 'day')
                    nextCallback(null)
                }
            ],function(err){
                err ? whilstCallback(`We've got an error, while scraping the ${currentDate}:\n`, err) : whilstCallback(null)
            })
        }, function(err){
            logger.info(`Done for ${direction.name} direction`);
            err ? directionSeriesCallback(`We've got an error, while changing direction the ${currentDate}:\n`, err) : directionSeriesCallback(null)
        }             
    )
}

function getTimeSlot(hour){
    if (hour>0 && hour<=4) return 'night'
    if (hour>4 && hour<=8) return 'morning'
    if (hour>8 && hour<=12) return 'afternoon'
    if (hour>12 && hour<=16) return 'daytime'
    if (hour>16 && hour<=20) return 'evening'
    if (hour>20 && hour<=24) return 'late evening'
}