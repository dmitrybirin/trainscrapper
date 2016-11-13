var winston = require('winston');

var logger = new (winston.Logger)({
    transports: [
      new (winston.transports.Console)({level:process.env.LOGLEVEL || 'info'})
    ]
});

module.exports = logger;