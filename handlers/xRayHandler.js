'use strict'

var Xray = require('x-ray');

var x = Xray({ filters: {
    trimN: function (value) {
        return typeof value === 'string' ? value.replace(/\n/g,'').trim() : value
    },
    trimT: function (value) {
        return typeof value === 'string' ? value.replace(/\t/g,'').trim() : value
    },
    trimRub: function (value) {
        return typeof value === 'string' ? value.replace(' руб.', '').trim() : value
    },
    toInt: function(value){
        return typeof value === 'string' ? parseInt(value) : value
    },
    toFloat: function(value){
        return typeof value === 'string' ? parseFloat(value) : value
    },
    toHoursString: function(value){
        var delimeter = value.indexOf(' ч')
        var hours = parseInt(value.slice(0, delimeter).trim())
        var mins = parseInt(value.slice(delimeter+2, delimeter+5).trim())
        return (hours + mins/60).toFixed(2)
    }
}
});

module.exports = x 