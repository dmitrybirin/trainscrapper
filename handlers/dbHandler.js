'use strict'
var MongoClient = require('mongodb').MongoClient
var assert = require('assert')
var async = require('async')
var events = require('events');

var url = 'mongodb://localhost:27017/rzd'
var targetColletion = 'tickets_data'
var counterCollection = 'counters'

var db;

function connect(callback) {
  if (db === undefined) {
    console.log('Connecting to database..');
    MongoClient.connect(url, function(err, database) {
      assert.equal(err, null)
      db = database;
      callback(null, db);
    });  
  } else {
    callback(null, db);
}}


exports.addDataToDb = function(ticketsData){
    connect(function(err, db) {
        assert.equal(err, null)
        async.eachSeries(
            ticketsData,
            function(data, callback){
                async.waterfall([
                    function(callback){
                        db.collection(counterCollection).findAndModify(
                            {_id: 'ticketId' },
                            [],
                            {$inc:{sequence_value:1}}, 
                            function(err, result){
                                assert.equal(err, null);
                                callback(null,result.value.sequence_value) 
                            })
                    },
                    function(id, callback){
                        data._id = id;
                        db.collection(targetColletion).insertOne(data, {safe: true},function(err){
                            assert.equal(err, null);
                            console.log(`Ticket data with ${id} id on ${data.departureDateTime} was successfully added to db`);
                            callback(null)
                        })
                    }], function(err){
                        assert.equal(err, null);
                        callback(null)
                    })
            }, 
            function(err){
                if (!err) {
                    console.log('Closing the database connection...');
                    db.close();
                }
                else console.log('Error occured, while adding stuff to db...\n', err);
        })
    })
}