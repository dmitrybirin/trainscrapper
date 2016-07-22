'use strict'
var Nightmare = require('nightmare');

var t = require('./handlers/timeHandler')
var u = require ('./handlers/urlHandler')
var x = require ('./handlers/xRayHandler')
var db = require('./handlers/dbHandler')

let directions = [
    {name: 'toStPete', fromCity: "МОСКВА", fromCode:2000000, toCity:"САНКТ-ПЕТЕРБУРГ", toCode: 2004000},
    {name: 'toMoscow', fromCity: "САНКТ-ПЕТЕРБУРГ", fromCode:2004000, toCity:"МОСКВА", toCode: 2000000}
]

let currentDate = t.dateToFormat(new Date('08.21.2016'))
let direction = directions[0]

var reqUrl = u.getUrl(currentDate, direction)

console.log(reqUrl);

Nightmare({ show: false })
  .goto(reqUrl)
  .wait('table.trlist')
  .evaluate(function () {
    return document.querySelector('table.trlist').innerHTML
  })
  .end()
  .then(function (rzdTable) {
    x(rzdTable, '.trlist__trlist-row', [{
        number: '.trlist__cell-pointdata__tr-num',
        brand: '.trlist__cell-pointdata__tr-brand | trimN',
        departureStation: '.trlist__cell-pointdata__tr-route:nth-child(1)',
        arrivalStation: '.trlist__cell-pointdata__tr-route:nth-child(2)',
        carrier: '.trlist__cell-pointdata__tr-carrier | trimT | trimN',
        departureDateTime: 'td:nth-child(4) .trlist__cell-pointdata__time',
        arrivalDateTime: 'td:nth-child(8) .trlist__cell-pointdata__time',
        wayHours: '.trlist__cell-pointdata__route-duration | toHoursString | toFloat',
        wifi: '.trlist-ico-size-norm__wifi@title',
        varPrice: '.trlist-ico-size-norm__dynprice@data-tooltip-key',
        cars: x('.trlist__table-price tbody tr', [{
            type: 'td',
            freeSeats: '.trlist__table-price__freeseats | toInt',
            price: '.trlist__table-price__price span | trimN | trimRub | toInt'   
        }])
    }])(function(err, raw_data){
        var resultData = []
        var id = 0;
        raw_data.map((train)=>{            
            train.cars.map((car)=>{
                var typeData = car;
                typeData.trainNumber = train.number;
                typeData.departureDateTime = new Date(`${currentDate.usStr} ${train.departureDateTime}`)
                typeData.arrivalDateTime = new Date(`${currentDate.usStr} ${train.arrivalDateTime}`)
                typeData.scanDateTime = new Date()
                typeData.hoursInWay = train.wayHours
                typeData.carrier = train.carrier
                typeData.brand = train.brand
                typeData.varPrice = train.varPrice ? true : false
                typeData.wifi = train.wifi ? true : false
                typeData.id = id;
                resultData.push(typeData)
            })
        })
    // db.addDataToDb(resultData)
    })
  })
  .catch(function (error) {
    console.error('Scrap failed:', error);
  });