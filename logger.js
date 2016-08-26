var winston = require('winston');
var app = require('./app')

var logger = new (winston.Logger)({
    transports: [
      new (winston.transports.Console)()
    ]
});

logger.on('logging', function (transport, level, msg, meta) {
    app.io.emit(level, msg);
});

module.exports = logger;