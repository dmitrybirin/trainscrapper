'use strict'
var Nightmare = require('nightmare');
var async = require('async')

var u = require ('./handlers/urlHandler')
var x = require ('./handlers/xRayHandler')
var db = require('./handlers/dbHandler')

exports.scrapData = function(date, direction){
    Nightmare({ show: true })
    .goto(u.getUrl(date, direction))
    .wait('table.trlist')
    .evaluate(function () {
        return document.querySelector('table.trlist').innerHTML
    })
    .end()
    .then(function (rzdTable) {
        x(rzdTable, '.trlist__trlist-row', [{
            number: '.trlist__cell-pointdata__tr-num | trimNumber',
            brand: '.trlist__cell-pointdata__tr-brand | trimN',
            departureStation: '.trlist__cell-pointdata__tr-route:nth-child(1)',
            arrivalStation: '.trlist__cell-pointdata__tr-route:nth-child(2)',
            carrier: '.trlist__cell-pointdata__tr-carrier | trimT | trimN',
            departureTime: 'td:nth-child(4) .trlist__cell-pointdata__time',
            departureDate: 'td:nth-child(4) .trlist__cell-pointdata__date-sub | trimLine | rzdToUsDate',
            arrivalTime: 'td:nth-child(8) .trlist__cell-pointdata__time',
            arrivalDate: 'td:nth-child(8) .trlist__cell-pointdata__date-sub | trimLine |rzdToUsDate',
            wayHours: '.trlist__cell-pointdata__route-duration | toHoursString | toFloat',
            wifi: '.trlist-ico-size-norm__wifi@title',
            varPrice: '.trlist-ico-size-norm__dynprice@data-tooltip-key',
            cars: x('.trlist__table-price tbody tr', [{
                type: 'td',
                freeSeats: '.trlist__table-price__freeseats | toInt',
                price: '.trlist__table-price__price span | trimN | trimRub | toInt'   
            }])
        }])(transformDataToDb)
    })
    .catch(function (error) {
        console.error('Scrap failed:', error);
    });
}

var transformDataToDb = function(err, raw_data){
    console.log(raw_data[0]);
    async.concat(raw_data, (train, callback) => {
        async.map(train.cars, (car, callback)=>{
            let ticket = car;
            ticket.trainNumber = train.number;
            ticket.departureStation = train.departureStation
            ticket.arrivalStation = train.arrivalStation
            ticket.departureDateTime = new Date(`${train.departureDate} ${train.departureTime}`)
            ticket.arrivalDateTime = new Date(`${train.arrivalDate} ${train.arrivalTime}`)
            ticket.scanDateTime = new Date()
            ticket.hoursInWay = train.wayHours
            ticket.carrier = train.carrier
            ticket.brand = train.brand
            ticket.varPrice = train.varPrice ? true : false
            ticket.wifi = train.wifi ? true : false
            callback(null, ticket)
        }, function(err, results){
            if (!err) callback(null, results)
            else console.log('Error occured, while transforming car to ticket...\n', err);
        })            
    }, function(err,results){
        if (!err) db.addDataToDb(results)
        else console.log('Error occured, while iterating on trains...\n', err);
    })
}