'use strict'

var scrapper = require('./scrapper')
var t = require('./handlers/timeHandler')

let directions = [
    {name: 'toStPete', fromCity: "МОСКВА", fromCode:2000000, toCity:"САНКТ-ПЕТЕРБУРГ", toCode: 2004000},
    {name: 'toMoscow', fromCity: "САНКТ-ПЕТЕРБУРГ", fromCode:2004000, toCity:"МОСКВА", toCode: 2000000}
]

let currentDate = t.dateToFormat(new Date('08.21.2016'))
let direction = directions[0]

scrapper.scrapData(currentDate, direction)