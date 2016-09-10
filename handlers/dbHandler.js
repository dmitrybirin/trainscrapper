'use strict'
var assert = require('assert')
var async = require('async')
var mongojs = require('mongojs')
var logger = require('./../logger')

var db = mongojs(process.env.MONGODB_URI, ['counters', 'tickets'])

exports.getTheBatchValue = function(){
    return new Promise(function(resolve, reject){
        logger.debug('Getting the batchId ...')
        db.counters.findAndModify({
                    query: {_id: 'batchId' },
                    update: {$inc:{sequence_value:1}}
                },
                function(err, result){
                    if(err) {
                        logger.error('Error occurred, while getting the batchId', err); 
                        return reject(err)
                    }
                    
                    else{
                        logger.debug('done.')
                        return resolve(result.sequence_value)
                    } 
            })}
)}

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
                                logger.debug(`Ticket data with ${id} id on ${data.departure.dateTime} (departure date) was successfully added to db`)
                                callback(null)
                            }
                        })
                    }], function(err){
                        err ? eachSeriesCallback(err) : eachSeriesCallback(null)
                    })
            }, 
            function(err){
                if (!err) {
                    logger.debug(`All items on ${ticketsData[0].departure.date} has been added to the DB.`);
                    next(null)
                }
                else logger.error('Error occured, while adding stuff to db...\n', err);
        })
}

exports.close = function(){
    db.close()
}