'use strict'
var Horseman = require('node-horseman')
var async = require('async')
var moment = require('moment')

var x = require ('./handlers/xRayHandler')
var db = require('./handlers/dbHandler')
var logger = require('./logger')

var currentUrl = 'https://pass.rzd.ru/'
var horsemanInit = () => {
    return new Horseman({timeout:15000}).viewport(1024,800)    
    .userAgent('Mozilla/5.0 (Windows NT 6.1; WOW64; rv:27.0) Gecko/20100101 Firefox/27.0')
    .on('consoleMessage', (msg) => logger.silly(msg))
    .on('error', (error) => logger.error(error))
}
var horseman = horsemanInit()

exports.init = function(date, direction, callback){
    logger.debug('Open the page by the Horseman')
    horseman
    .open(currentUrl).then(()=>callback(null))
}

exports.checkForCaptcha = function(callback){
        logger.debug('Checking for captcha...')
        horseman.wait(3000).visible('span.j-captcha-box img').then((result)=>
        {
            if (result)
            {
                logger.info('Captcha is here!!! Restarting the Horseman...');
                async.series([
                    (stopCallback) => {horseman.close(); stopCallback(null)},
                    (startCallback) => {
                        horsemanInit()
                        .open(currentUrl)
                        .then(() =>this.checkForCaptcha(()=>startCallback(null)))}
                ],function(err){
                    !err ? callback(null) : callback(err) 
                })
            }
            else{
                logger.debug('No captcha.');
                callback(null)
            }
        })
}

exports.done = function(){
    async.series([
        (dbCallback) => {logger.info('Closing the db connection...');db.close(); dbCallback(null)},
        (horsemanCallback) => {logger.info('Closing the horseman...');horseman.close(); horsemanCallback(null)}
    ],function(err){
        if (err) logger.error('Error occured, while terminating Db and Horseman:\n', err); 
    })
}

exports.scrapData = function(date, direction, next){
    logger.info(`Beginning to scrap data on ${date.format('DD.MM.YYYY')} to ${direction.toCity}...`);
    let scanDateTime = moment(new Date())._d
    let scanTimeSlot = getTimeSlot(scanDateTime)
    
    horseman
    .type('input[placeholder=\"Откуда\"]', direction.fromCity)
    .type('input[placeholder=\"Куда\"]', direction.toCity)
    .type('input#date0', date.format('DD.MM.YYYY'))
    .click('button#Submit')
    .waitForSelector('table.trlist')
    .screenshot('current.png')
    .evaluate(function () {
        return document.querySelector('table.trlist').innerHTML
    })
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
                async.map(train.cars, (car, callback)=>{
                    let ticket = car;
                    ticket.trainNumber = train.number
                    ticket.direction = direction.name
                    ticket.departureStation = train.departureStation
                    ticket.arrivalStation = train.arrivalStation
                    ticket.departureDateTime = parseDateAndTimeToDate(train.departureDate, train.departureTime)
                    ticket.arrivalDateTime = parseDateAndTimeToDate(train.arrivalDate, train.arrivalTime)
                    ticket.scanDateTime = scanDateTime
                    ticket.scanTimeSlot = scanTimeSlot
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
        horseman.close()
        next(err)
    })
}

var parseDateAndTimeToDate =function(date, time){
    return moment(`${date} ${time}`, 'DD.MM.YYYY HH:mm')._d
}

var getTimeSlot = function(date){
    var hour = new Date(date).getHours()
    if (hour>0 && hour<=4) return 'night'
    if (hour>5 && hour<=8) return 'morning'
    if (hour>9 && hour<=12) return 'afternoon'
    if (hour>13 && hour<=16) return 'daytime'
    if (hour>17 && hour<=20) return 'evening'
    if (hour>21 && hour<=24) return 'late evening'
}