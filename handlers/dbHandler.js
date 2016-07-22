'use strict'
var MongoClient = require('mongodb').MongoClient
var assert = require('assert')
var async = require('async')
var events = require('events');

var url = 'mongodb://localhost:27017/rzd'
var targetColletion = 'tickets_data'
var counterCollection = 'counters'
var eventEmitter = new events.EventEmitter();
eventEmitter.addListener('disconnect', function(){
    console.log('Closing the database connection...');
    db.close();
});

var db;
var countToDone;

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

var getSequenceAndInsertIntoDb = function(db, data){
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
                countToDone-=1;
                console.log(countToDone);
                if (countToDone ==0) eventEmitter.emit('disconnect') 
            })
        }], function(err){
            assert.equal(err, null);
        })
}

exports.addDataToDb = function(ticketsData){
    connect(function(err, db) {
        assert.equal(err, null)
        countToDone = ticketsData.length;
        for (let dataBit of ticketsData){
            getSequenceAndInsertIntoDb(db, dataBit)
        }
    })
}