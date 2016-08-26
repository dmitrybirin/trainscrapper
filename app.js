'use strict'
var express = require('express');
var taskController = require('./taskController');

var app = express();

app.get('/api/task/gatherDataFor/:daysCount', taskController.gatherDataForDays)

var port = process.env.PORT || 1234;

app.listen(port, function(){
    console.log(`I'm listening to the port ${port}`)
})