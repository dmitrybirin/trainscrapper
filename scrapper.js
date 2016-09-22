'use strict'
var Horseman = require('node-horseman')
var async = require('async')
var moment = require('moment')
var Hashids = require("hashids");
var hashids = new Hashids(process.env.HASH_SALT, 10);

var x = require ('./handlers/xRayHandler')
var db = require('./handlers/dbHandler')
var logger = require('./logger')

var currentUrl = 'http://pass.rzd.ru/'

var horseman;

var horsemanInit = () => {
    return new Horseman({timeout:process.env.HORSEMAN_TIMEOUT})    
    .userAgent('Mozilla/5.0 (Windows NT 6.1; WOW64; rv:27.0) Gecko/20100101 Firefox/27.0')
    .on('consoleMessage', (msg) => logger.silly(msg))
    .on('error', (error) => logger.error(error))
}

var checkCaptcha = function(){
    return new Promise( function( resolve, reject ){
        return horseman
        .wait(3000).visible('span.j-captcha-box img')
        .then((result)=>
        {
            if (result)
            {
                logger.info('Captcha is here!!! Restarting the Horseman...');
                async.series([
                    (stopCallback) => {horseman.close(); stopCallback(null)},
                    (startCallback) => {
                        horsemanInit()
                        .open(currentUrl)
                        .then(()=>startCallback(null))}
                ],function(err){
                    if (!err) return horseman.then(checkCaptcha)
                    if (err) next(err) 
                })
            }
            else{
                logger.debug('No captcha.');
                return horseman
            }
        })
        .then(resolve)
    })
}

var getDate = function (){
    return horseman.evaluate(function(){return $('input#date0').attr('value')})
}

var checkDate = function(neededDate){
    return new Promise( function( resolve, reject ){
        return getDate()
        .then(function(val){
                if (!val.includes(neededDate)){
                    logger.debug(`date is ${val}, incrementing...`)
                    return horseman.click('.box-form__datetime__arrow-right.j-right')
                    .then(function(){
                        return neededDate
                    })
                    .then(checkDate)
                } 
                else{
                    logger.debug('date is right.')
                    return horseman
                }
        })
        .then(resolve);  
    })
}

function clickAndCheckSpinner(){
    var spinnerCheckCount = 0
    var innerClickAndCheckSpinner = function(maxCount){
        logger.debug('Checking the spinner..')
        return horseman
        .click('#Submit')
        .waitForSelector('div#ajaxTrainTable')
        .catch(function(){
            logger.debug('No spinner found! Retrying...')
            if(spinnerCheckCount < maxCount){
                spinnerCheckCount++
                return innerClickAndCheckSpinner(maxCount)
            } 
            else{
                logger.debug('Terminating the process...')
                throw new Error(`Spinner was not found after ${maxCount} attempts`)
            }
        })}
        return new Promise(function(resolve, reject){
            return innerClickAndCheckSpinner(process.env.REPEAT_COUNT)
                .catch((err) => console.log('Error while trying to find the spinner', err))
                .then(resolve)
        })
}

exports.scrapData = function(date, direction, batchInfo, next){
    let scanDateTime = moment(new Date())._d
    horseman = horsemanInit()
    horseman
    .open(currentUrl)
    .then(checkCaptcha)
    .then(()=>logger.info(`Beginning to scrap data on ${date.format('DD.MM.YYYY')} to ${direction.toCity}...`))
    .type('input[placeholder=\"Откуда\"]', direction.fromCity)
    .type('input[placeholder=\"Куда\"]', direction.toCity)
    .then(function(){return date.format('DD.MM.YYYY')})
    .then(checkDate)
    .then(clickAndCheckSpinner)
    .waitForSelector('table.trlist')
    .html('table.trlist')
    .then(function (rzdTable) {
        logger.debug(`Got the HTML. Srapping...`);
        x(rzdTable, '.trlist__trlist-row', [{
            number: '.trlist__cell-pointdata__tr-num | trimNumber',
            brand: '.trlist__cell-pointdata__tr-brand | trimN',
            departureStation: '.trlist__cell-pointdata__tr-route:nth-child(1)',
            arrivalStation: '.trlist__cell-pointdata__tr-route:nth-child(2)',
            carrier: '.trlist__cell-pointdata__tr-carrier | trimT | trimN',
            departureTime: 'td:nth-child(4) .trlist__cell-pointdata__time',
            departureDate: 'td:nth-child(4) .trlist__cell-pointdata__date-sub | trimLine',
            arrivalTime: 'td:nth-child(8) .trlist__cell-pointdata__time',
            arrivalDate: 'td:nth-child(8) .trlist__cell-pointdata__date-sub | trimLine',
            wayHours: '.trlist__cell-pointdata__route-duration | toHoursString | toFloat',
            wifi: '.trlist-ico-size-norm__wifi@title',
            varPrice: '.trlist-ico-size-norm__dynprice@data-tooltip-key',
            cars: x('.trlist__table-price tbody tr', [{
                type: 'td',
                freeSeats: '.trlist__table-price__freeseats | toInt',
                price: '.trlist__table-price__price span | trimN | trimRub | toInt'   
            }])
        }])(function(err, raw_data){
            logger.debug(`Transforming scrapped data...`);
            async.concat(raw_data, (train, callback) => {
                async.map(train.cars, (car, callback)=> {
                    let ticket = car;
                    ticket.trainNumber = train.number
                    ticket.trainHash = getTrainHash(train.number, train.type, train.departureDate, train.departureTime)
                    ticket.direction = direction.name
                    ticket.batch = {
                        id: batchInfo.id,
                        timeSlot: batchInfo.timeSlot,
                        date: batchInfo.scanDate,
                        time: batchInfo.scanTime,
                    }
                    ticket.departure = {
                        station: train.departureStation,
                        date: train.departureDate,
                        time: train.departureTime,
                        dateTime: parseDateAndTimeToDate(train.departureDate, train.departureTime)
                    }
                    ticket.arrival = {
                        station: train.arrivalStation,
                        date: train.arrivalDate,
                        time: train.arrivalTime,
                        dateTime: parseDateAndTimeToDate(train.arrivalDate, train.arrivalTime)
                    }
                    ticket.scanDateTime = scanDateTime
                    ticket.hoursInWay = train.wayHours
                    ticket.carrier = train.carrier
                    ticket.brand = train.brand
                    ticket.varPrice = train.varPrice ? true : false
                    ticket.wifi = train.wifi ? true : false
                    callback(null, ticket)
                }, function(err, results){
                    if (!err) {
                        callback(null, results)
                    }
                    else logger.info('Error occured, while transforming car to ticket...\n', err)
                })            
            }, function(err,results){
                if (!err) {
                    logger.debug(`Transform completed adding to db...`);
                    db.addDataToDb(results, next); 
                }
                else logger.error('Error occured, while iterating on trains...\n', err)
            })
        })
    })
    .catch(function(err){
        logger.error('The Horseman error has occured.')
        next(err)
    })
    .finally(function(){
        logger.debug('Closing the Horseman instance')
        horseman.close()
    })

}

exports.done = function(){
    logger.info('Closing the db connection...')
    db.close()
}

var parseDateAndTimeToDate =function(date, time){
    return moment(`${date} ${time}`, 'DD.MM.YYYY HH:mm')._d
}

function getTrainHash(trainNumber, type, departureDate, departureTime){
    var stringToEncode = `${trainNumber}, ${type} ticket on ${departureDate} at ${departureTime}`
    var hex = Buffer(stringToEncode).toString('hex');
    return hashids.encodeHex(hex);    
}
