'use strict'

var Xray = require('x-ray');

var x = Xray({ filters: {
    trimN: function (value) {
        return value.replace(/\n/g,'').trim()
    },
    trimT: function (value) {
        return value.replace(/\t/g,'').trim()
    },
    trimRub: function (value) {
        return value.replace(' руб.', '').trim()
    },
    trimNumber: function (value) {
        return value.replace(/№/, '').trim()
    },
    trimLine: function(value){
        return value.replace(/\|/g,'').trim()
    },
    toInt: function(value){
        return parseInt(value)
    },
    toFloat: function(value){
        return parseFloat(value)
    },
    toHoursString: function(value){
        var delimeter = value.indexOf(' ч')
        var hours = parseInt(value.slice(0, delimeter).trim())
        var mins = parseInt(value.slice(delimeter+2, delimeter+5).trim())
        return (hours + mins/60).toFixed(2)
    },
    rzdToUsDate: function(value){
        var m = value.match(/^(\d{1,2}).(\d{1,2}).(\d{4})$/)
        return `${m[2]}.${m[1]}.${m[3]}`      
    }
}
});

module.exports = x