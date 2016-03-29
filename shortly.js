var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var bcrypt = require('bcrypt-nodejs');
var jwt = require('jsonwebtoken');
var cookieParser = require('cookie-parser');

var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

var app = express();


app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.set('superSecret', 'thisisoursecrettokenstringblancheisa');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser())
app.use(express.static(__dirname + '/public'));

var checkUser = function(req, res, next) {
  jwt.verify(req.cookies.token, app.get('superSecret'), function(err, body) {
    if (err) {
      res.redirect(301, '/login');
    } else {
      next();
    }
  });
};

app.get('/', checkUser,
function(req, res) {
  res.render('index');
});

app.get('/login', function(req, res) {
  res.render('login');
});

app.get('/signup', function(req, res) {
  res.render('signup');
});

app.get('/create', checkUser,
function(req, res) {
  res.render('index');
});

app.get('/links', checkUser,
function(req, res) {
  Links.reset().fetch().then(function(links) {
    res.send(200, links.models);
  });
});

app.post('/links', checkUser,
function(req, res) {
  var uri = req.body.url;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.send(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.send(200, found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.send(404);
        }

        Links.create({
          url: uri,
          title: title,
          baseUrl: req.headers.origin
        })
        .then(function(newLink) {
          res.send(200, newLink);
        });
      });
    }
  });
});

app.post('/signup',
function(req, res) {
  var username = req.body.username;
  var password = req.body.password;

  new User({username: username}).fetch().then(function(user) {
    if (user) {
      res.send(404, 'User Already Exists, Silly-Billy!');
    } else {
      Users.create({
        username: username,
        password: password
      })
      .then(function() {
        res.redirect('/login');
      });
    }
  });
});

app.post('/login',
function(req, res) {
  var username = req.body.username;
  var password = req.body.password;

  new User({username: username}).fetch().then(function(user) {
    if (user) {
      // check if password mathces returned pasword via found.attributes.password
      bcrypt.compare(password, user.attributes.password, function(err, match) {
        if (err) { throw err; }
        if (match) {
          var token = jwt.sign(user, app.get('superSecret'), {
            expiresIn: 3600,
            issuer: 'us',
            subject: user.attributes.username
          });
          console.log(token);
          res.cookie('token', token);
        //  res.json({success: true, message: 'TOKENS ARE BETTER THAN COOOOOKIES', token: token});
          res.redirect('/');
        } else {
          res.send(404, 'Thief! That is the not the right password!');
        }
      });
    } else {
      res.send(404, 'WHOOOOO are you who who who who? I realy wanna know!');
    }
  });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/


/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        linkId: link.get('id')
      });

      click.save().then(function() {
        link.set('visits', link.get('visits') + 1);
        link.save().then(function() {
          return res.redirect(link.get('url'));
        });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);
