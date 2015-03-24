'use strict';

var util = require('util');

function WhiteList(list) {
  this.list = util.isArray(list) ? list : [];
  this.length = this.list.length;
}

WhiteList.prototype.isWhite = function(host) {

  function match(text, test) {
    var regexp = new RegExp('^' + text.replace('.', '\\.').replace('*', '.+') + '$');
    return regexp.test(test);
  }

  if (!this.list.length || typeof host != 'string') {
    return false;
  }

  return this.list.some(function (whiteHost) {
    if (typeof whiteHost != 'string') {
      return false;
    }
    return match(whiteHost, host);
  })
}

module.exports = function(list) {
  return new WhiteList(list);
}
