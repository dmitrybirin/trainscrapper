'use strict'
exports.dateToFormat = function (inputDate){
    var date = new Date(inputDate);
    var dd = date.getDate();
    var mm = date.getMonth();
    var yyyy = date.getFullYear();
    return {
        date:new Date(yyyy, mm, dd), 
        rzdStr: `${dd}.${mm+1}.${yyyy}`,
        usStr: `${mm+1}.${dd}.${yyyy}`
    }   
}

exports.nextDay = function nextDay(inputDate, daysInFuture){
    var date = new Date(inputDate)
    date.setDate(date.getDate() + daysInFuture)
    return this.dateToFormat(date)
}