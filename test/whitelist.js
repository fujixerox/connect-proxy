var WhiteList = require('../lib/whitelist')
  , should    = require('should');

describe('whitelist', function() {

  var hosts = [ 'github.com', 'bitbucket.com', '*.amazonaws.com' ];
  var whitelist = WhiteList(hosts);

  describe('#isWhite', function() {

    it('should return false when the white list is initialized with empty array', function() {
      var emptyList = WhiteList([]);
      emptyList.isWhite('test').should.be.false;
    })

    var tests = [
    [ { test: 'test' }, false ],
    [ [ 'test' ], false ],
    [ 1, false ],
    [ 1.0, false ],
    [ 'test', false ],
    [ 'com', false ],
    [ 'github.com', true  ],
    [ 'api.github.com', false ],
    [ 'bitbucket.com', true  ],
    [ 'api.bitbucket.com', false ],
    [ 'amazon.com', false ],
    [ 'aws.amazon.com', false ],
    [ 'compute.amazonaws.com', true ],
    [ 'ap-northeast-1.compute.amazonaws.com', true ],
    [ 'ec2-127-0-0-1.ap-northeast-1.compute.amazonaws.com', true ]
    ];

    tests.forEach(function (test) {
      it('should return ' + test[1] + ' when query is ' + test[0], function() {
        whitelist.isWhite(test[0]).should.equal(test[1]);
      })
    })

    tests.filter(function (test) {
      return typeof test[0] === 'string';
    }).forEach(function (test) {
      it('should return true when the white list contains wildcard and query is ' + test[0], function() {
        var wildcard = WhiteList([ '*' ]);
        wildcard.isWhite(test[0]).should.be.true
      })
    })

  })
})
