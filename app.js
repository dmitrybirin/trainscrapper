'use strict'
var express = require('express');
var taskController = require('./taskController');

var app = express();
var server = require('http').Server(app);
var io = require('socket.io').listen(server);

app.use(express.static('public'));

app.get('/api/task/gatherDataFor/:daysCount', taskController.gatherDataForDays)

var port = process.env.PORT || 1234;

server.listen(port, function(){
    console.log(`I'm listening to the port ${port}`)
})

exports.io = io;