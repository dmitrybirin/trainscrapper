# Train ticket scrapper

Simple still in progress node.js app, that browse to the RZD site and scrap the tickets data without exploiting their API.
Run on node ^6.5.0 with [horseman](https://github.com/johntitus/node-horseman) and [x-ray](https://github.com/lapwinglabs/x-ray) under the hood.
Works with Moscow-St.Pete and back for the personal using.

The purpose: get the data for the long time to analize the changes in the tickets price

## Install

```
npm install
```
Script is getting the mongoDB server's connection string from config.js or env variable MONGODB_URI

The DB is not initializing by now, so you need to have 'rzd' DB and 'tickets' and 'counters' DBs

And counters in emm.. counters

```javascript
{ "_id" : "ticketId", "sequence_value" : 0 }
{ "_id" : "batchId", "sequence_value" : 0 } 
```

## Run

if MongoDB connection string in the config.js
```
node task.js 35
```
where 35 is number of the days to scrap from today

## Parameters

The following process environment variables could be used with the task

```
MONGODB_URI
```
MongoDB connection string if not already defined in config.js. 

No defaults. Scripts terminates without it.

```
LOGLEVEL
```

Define log level of the application. 

Default 'info'. Could be 'debug' or 'error'
 

```
HORSEMAN_TIMEOUT
```

Timeout in ms, defines how long phantom will wait for something before giving up.

Default is 30000 ms.

```
REPEAT_COUNT
```

Because of slow site work, waiting for data could exceed the timeout,
so the script is constantly trying to get the spinner first.

Parameter defines number of attempts to get spinner element.

Default is 10.  


## TODO

- [ ] Refactoring to implement either Promises or async (cause now it's a working mess)
- [ ] Parametrize the direction of scraping
- [ ] DB is too overpopulated with ticket data. Need to fix it by relations for example
- [ ] Do not close the phantom instances every cycle 
- [ ] Get rid of direction mad json leftovers from the trains site
- [ ] Init the empty Database  