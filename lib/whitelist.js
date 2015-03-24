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

  for (var i = 0; i < this.list.length; i++) {
    var whiteHost = this.list[i];

    if (typeof whiteHost != 'string') {
      continue;
    }

    if (match(whiteHost, host)) {
      return true;
    }
  }

  return false;
}

module.exports = function(list) {
  return new WhiteList(list);
}
