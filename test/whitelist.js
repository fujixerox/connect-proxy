'use strict';

var WhiteList = require('../lib/whitelist');

var should = require('should'); // jshint unused:false

describe('whitelist', function () {

  var hosts = [ 'github.com', 'bitbucket.com', '*.amazonaws.com', '192.168.0.1', '10.0.0.*' ];
  var whitelist = new WhiteList(hosts);

  describe('#isWhite', function () {

    it('should return false when the white list is initialized with empty array', function () {
      var emptyList = new WhiteList([]);
      emptyList.isWhite('test').should.be.false;
    });

    it('should return false when the white list is initialized with non array', function () {
      var emptyList = new WhiteList({});
      emptyList.isWhite('test').should.be.false;
    });

    it('should return false when the white list is initialized with non string array', function () {
      var emptyList = new WhiteList([0]);
      emptyList.isWhite('test').should.be.false;
    });

    var tests = [
      { args: { test: 'test' }, expected: false },
      { args: [ 'test' ], expected: false },
      { args: 1, expected: false },
      { args: 1.0, expected: false },
      { args: 'test', expected: false },
      { args: 'com', expected: false },
      { args: 'github.com', expected: true  },
      { args: 'api.github.com', expected: false },
      { args: 'bitbucket.com', expected: true  },
      { args: 'api.bitbucket.com', expected: false },
      { args: 'amazon.com', expected: false },
      { args: 'aws.amazon.com', expected: false },
      { args: 'compute.amazonaws.com', expected: true },
      { args: 'ap-northeast-1.compute.amazonaws.com', expected: true },
      { args: 'ec2-127-0-0-1.ap-northeast-1.compute.amazonaws.com', expected: true },
      { args: '192.168.0.1', expected: true },
      { args: '192.168.0.2', expected: false },
      { args: '10.0.0.1', expected: true },
      { args: '10.0.0.2', expected: true },
      { args: '10.0.1.1', expected: false }
    ];

    tests.forEach(function (test) {
      it('should return ' + test.expected + ' when query is ' + test.args, function () {
        whitelist.isWhite(test.args).should.equal(test.expected);
      });
    });

    tests.filter(function (test) {
      return typeof test.args === 'string';
    }).forEach(function (test) {
      it('should return true when the white list contains wildcard and query is ' + test.args, function () {
        var wildcard = new WhiteList([ '*' ]);
        wildcard.isWhite(test.args).should.be.true;
      });
    });

  });
});
