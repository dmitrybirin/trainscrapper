var moment = require('moment')
var qs = require('query-string');

var getTrainsUrl = "https://pass.rzd.ru/timetable/public/ru" 

exports.getUrl = function(date, direction){
    
    var innerData = {
        STRUCTURE_ID: 735,
        refererPageId: 704
    }

    var inputParams = {
        tfl:3,
        checkSeats:1,
        st0:direction.fromCity,
        code0:direction.fromCode,
        dt0:date.format('DD.MM.YYYY'),
        st1:direction.toCity,
        code1:direction.toCode,
        dt1: moment(date).add(1, 'day').format('DD.MM.YYYY')
    }  

    var paramsArray = []
    for (var param in inputParams) {
        if (inputParams.hasOwnProperty(param)) {
        paramsArray.push(`${param}=${inputParams[param]}`)
        }
    }

    return `${getTrainsUrl}?${qs.stringify(innerData)}#dir=0|${paramsArray.join('|')}`

}