'use strict'
var assert = require('assert')
var async = require('async')
var mongojs = require('mongojs')

var db = mongojs(process.env.MONGODB_URI, ['counters', 'tickets'])

exports.addDataToDb = function(ticketsData, next){
        async.eachSeries(
            ticketsData,
            function(data, eachSeriesCallback){
                async.waterfall([
                    function(callback){
                        db.counters.findAndModify({
                            query: {_id: 'ticketId' },
                            update: {$inc:{sequence_value:1}}
                        },
                        function(err, result){
                            if(err) callback(err)
                            else callback(null,result.sequence_value) 
                        })
                    },
                    function(id, callback){
                        data._id = id;
                        db.tickets.insert(data, {safe: true},function(err){
                            if(err) callback(err)
                            else {
                                if (process.env.DEBUG || false) console.log(`Ticket data with ${id} id on ${ticketsData[0].departureDateTime}(scrapped data) was successfully added to db`)
                                callback(null)
                            }
                        })
                    }], function(err){
                        err ? eachSeriesCallback(err) : eachSeriesCallback(null)
                    })
            }, 
            function(err){
                if (!err) {
                    if (process.env.DEBUG || false) console.log(`All items on ${ticketsData[0].departureDateTime}(scrapped data) has been added to the DB.`);
                    next(null)
                }
                else console.log('Error occured, while adding stuff to db...\n', err);
        })
}

exports.close = function(){
    db.close()
}