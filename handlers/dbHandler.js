'use strict'
var assert = require('assert')
var async = require('async')
var mongojs = require('mongojs')

var config = require('./../config')

var db = mongojs(config.dbUrl, ['counters', 'tickets'])

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
                            assert.equal(err, null);
                            callback(null,result.sequence_value) 
                        })
                    },
                    function(id, callback){
                        data._id = id;
                        db.tickets.insert(data, {safe: true},function(err){
                            assert.equal(err, null);
                            if (config.DEBUG) console.log(`Ticket data with ${id} id on ${ticketsData[0].departureDateTime}(scrapped data) was successfully added to db`)
                            callback(null)
                        })
                    }], function(err){
                        assert.equal(err, null);
                        eachSeriesCallback(null)
                    })
            }, 
            function(err){
                if (!err) {
                    if (config.DEBUG) console.log(`All items on ${ticketsData[0].departureDateTime}(scrapped data) has been added to the DB.`);
                    next(null)
                }
                else console.log('Error occured, while adding stuff to db...\n', err);
        })
}

exports.close = function(){
    db.close()
}