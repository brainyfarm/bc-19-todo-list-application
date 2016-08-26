var express = require('express')
var router = express.Router();

router.get('/', function(req, res, next){
    res.render('index', {title: 'TODO Application'});
});

router.get('/login', function(req, res, next){
    res.render('login', {title: 'TODO Application : Login'});
});

router.get('/register', function(req, res, next){
    res.render('register', {title: 'TODO Application : Sign up'});
});

module.exports = router;