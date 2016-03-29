var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');



var User = db.Model.extend({
  tableName: 'users', 
  hasTimestamps: true,
  defaults: {
    username: '',
    password: ''
  },
  initialize: function() {
    this.on('creating', function(model, attrs, options) {
      return new Promise(function(resolve, reject) {
        bcrypt.hash(attrs.password, null, null, function(err, hash) {
          if ( err ) { reject(err); }
          model.set('password', hash);
          resolve(hash);
        });
      });
    });
  }                                      
});


module.exports = User;    