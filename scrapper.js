'use strict'
var Nightmare = require('nightmare');
var async = require('async')
var moment = require('moment')

var u = require ('./handlers/urlHandler')
var x = require ('./handlers/xRayHandler')
var db = require('./handlers/dbHandler')
var config = require('./config')

var nightmare = Nightmare({ show: config.SHOWBROWSING }); 
var currentUrl;

exports.init = function(date, direction, callback){
    currentUrl = u.getUrl(date, direction);
    nightmare.goto(currentUrl).then(()=>callback(null))
}

exports.checkForCaptcha = function(callback){
        if (config.DEBUG) console.log('Checking for captcha...')
        nightmare.wait(3000).visible('span.j-captcha-box img').then((result)=>
        {
            if (result)
            {
                console.log('Captcha is here!!! Restarting the Nightmare...');
                async.series([
                    (stopCallback) => {nightmare._endNow(); stopCallback(null)},
                    (startCallback) => {nightmare = Nightmare({ show: config.SHOWBROWSING }); nightmare.goto(currentUrl).then(() =>startCallback(null))}
                ],function(err){
                    !err ? callback(null) : callback(err) 
                })
            }
            else{
                if (config.DEBUG) console.log('No captcha.');
                callback(null)
            }
        })
}

exports.done = function(){
    async.series([
        (dbCallback) => {if (config.DEBUG) console.log('Closing the db connection...');db.close(); dbCallback(null)},
        (nightmareCallback) => {if (config.DEBUG) console.log('Closing the nightmare...');nightmare._endNow(); nightmareCallback(null)}
    ],function(err){
        if (err) console.log('Error occured, while terminating Db and Nightmare:\n', err); 
    })
}

exports.scrapData = function(date, direction, next){
    console.log(`Beginning to scrap data on ${date.format('DD.MM.YYYY')} to ${direction.toCity}...`);
    let scanDateTime = moment(new Date())._d
    
    nightmare
    .wait('table.trlist')
    .evaluate(function () {
        return document.querySelector('table.trlist').innerHTML
    })
    .then(function (rzdTable) {
        if (config.DEBUG) console.log(`Got the HTML. Srapping...`);
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
            if (config.DEBUG) console.log(`Transforming scrapped data...`);
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
                    else console.log('Error occured, while transforming car to ticket...\n', err)
                })            
            }, function(err,results){
                if (!err) {
                    if (config.DEBUG) console.log(`Transform completed adding to db...`);
                    db.addDataToDb(results, next); 
                }
                else console.log('Error occured, while iterating on trains...\n', err)
            })
        })
    })
    .catch(function (error) {
        next(error)
    });
}

var parseDateAndTimeToDate =function(date, time){
    return moment(`${date} ${time}`, 'DD.MM.YYYY HH:mm')._d
}