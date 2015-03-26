'use strict';

var Proxy = require('../lib/connect-proxy');

var http    = require('http')
  , https   = require('https')
  , path    = require('path')
  , fs      = require('fs')
  , should  = require('should') // jshint unused:false
  , request = require('request');

// Becasue this test use Self-Signed Certificate,
// env NODE_TLS_REJECT_UNAUTHORIZED must be set 0
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

var httpsServerOpts = {
  key: fs.readFileSync(path.join(__dirname, 'key.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'cert.pem'))
};

describe('ConnectProxy', function () {

  describe('#init', function () {

    var tests = [
      [{}],

      [{ proxyHost: [ 'test' ] }],
      [{ proxyPort: [ 'test' ] }],
      [{ proxyHost: [ 'test' ], proxyPort: [ 'test' ] }],
      [{ proxyHost: [ 'test' ], whiteHosts: [ 'example.com' ] }],
      [{ proxyPort: [ 'test' ], whiteHosts: [ 'example.com' ] }],
      [{ proxyHost: [ 'test' ], proxyPort: [ 'test' ], whiteHosts: [ 'example.com' ] }],

      [{ proxyHost: 'proxy.com' }],
      [{ proxyPort: '80' }],
      [{ whiteHosts: [ 'example.com' ] }],
      [{ proxyHost: 'proxy.com', whiteHosts: [ 'example.com' ] }],
      [{ proxyPort: '80', whiteHosts: [ 'example.com' ] }],

      [{ proxyHost: 'proxy.com', proxyPort: 80 }],
      [{ proxyHost: 'proxy.com', proxyPort: '80' }],
      [{ whiteHosts: [] }],
      [{ proxyHost: 'proxy.com', proxyPort: 80, whiteHosts: [] }],
      [{ proxyHost: 'proxy.com', proxyPort: '80', whiteHosts: [] }],
      [{ whiteHosts: [ 'example.com' ] }],
      [{ proxyHost: 'proxy.com', proxyPort: 80, whiteHosts: [ 'example.com' ] }],
      [{ proxyHost: 'proxy.com', proxyPort: '80', whiteHosts: [ 'example.com' ] }],
      [{ whiteHosts: [ 'example.com', '*.sample.com' ] }],
      [{ proxyHost: 'proxy.com', proxyPort: 80, whiteHosts: [ 'example.com', '*.sample.com' ] }],
      [{ proxyHost: 'proxy.com', proxyPort: '80', whiteHosts: [ 'example.com', '*.sample.com' ] }]
    ];

    tests.forEach(function (test) {
      it('should success to create instance with (' + test + ')', function () {
        var self = {};
        Proxy.apply(self, test);

        self.should.not.be.null;
        self.should.be.instanceof.Proxy;
      });
    });
  });

  describe('#listen', function () {

    it('should be a success to listen by specifying the port', function (done) {
      var proxy = new Proxy();
      proxy.listen(5555, function () {
        (5555).should.be.exactly(proxy.address().port);
        proxy.close();
        done();
      });
    });

    var tests = [
      { args: { protocol: 'http', isWhite: false }, expected: { throughs: [ 'downstream' ] } },
      { args: { protocol: 'http', isWhite: true }, expected: { throughs: [ 'downstream' ] } },
      { args: { protocol: 'https', isWhite: false }, expected: { throughs: [ 'downstream' ] } },
      { args: { protocol: 'https', isWhite: true }, expected: { throughs: [ 'downstream', 'upstream' ] } }
    ];

    tests.forEach(function (test) {

      var actualThroughs = [];

      var server, downstream, upstream;
      var isHttps = (test.args.protocol === 'https');

      beforeEach(function startServer(done) {
        if (isHttps) {
          server = https.createServer(httpsServerOpts);
        } else {
          server = http.createServer();
        }

        server.on('request', function (req, res) {
          res.end();
        }).listen(function () {
          done();
        });
      });

      beforeEach(function startUpStreamProxy(done) {
        upstream = (new Proxy()).on('connect', function () {
          actualThroughs.push('upstream');
        }).listen(function () {
          done();
        });
      });

      beforeEach(function startDownStreamProxy(done) {
        downstream = (new Proxy({
          proxyHost: 'localhost',
          proxyPort: upstream.address().port,
          whiteHosts: test.args.isWhite ? [ 'localhost' ] : []
        })).on('connect', function () {
          actualThroughs.push('downstream');
        }).listen(function () {
          done();
        });
      });

      it('should be a success to access via ' + (isHttps ? 'https' : 'http') + ' to the host, which ' + (test.args.isWhite ? 'is' : 'isn\'t') + ' a white host', function (done) {

        var uri = (isHttps ? 'https' : 'http') + '://localhost:' + server.address().port;
        request({
          uri: uri,
          proxy: 'http://localhost:' + downstream.address().port
        }, function (err, res) {
          (err === null).should.be.true;
          (200).should.be.exactly(res.statusCode);
          test.expected.throughs.should.eql(actualThroughs);
          done();
        });
      });

      afterEach(function () {
        server.close();
        downstream.close();
        upstream.close();
      });
    });

    it('should cause a error', function (done) {
      var server = https.createServer(httpsServerOpts).listen();

      var proxy = new Proxy()
      .on('connect', function () {
        server.close();
        proxy.close();
      }).on('error', function (err) {
        err.should.not.be.null;
        done();
      }).listen(function () {
        request({
          uri: 'https://localhost:' + server.address().port,
          proxy: 'http://localhost:' + proxy.address().port
        }, function () {});
      });
    });
  });
});
