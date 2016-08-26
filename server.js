// server.js
// load the things we need
var express = require('express');
var app = express();
var routes = require('./routes/index');
var path = require('path');

// set the view engine to ejs
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));


app.use('/', routes)
app.use(express.static(__dirname + '/views'));


app.listen(8080);
console.log('Running on port localhost:8080/');