var Proxy = require('../lib/connect-proxy');

var http    = require('http')
  , https   = require('https')
  , path    = require('path')
  , fs      = require('fs')
  , should  = require('should')
  , request = require('request');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

describe('ConnectProxy', function() {

  describe('#init', function() {

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

  describe('#listen', function() {

    it('should be a success to listen by specifying the port', function (done) {
      var proxy = new Proxy();
      proxy.listen(5555, function () {
        (5555).should.be.exactly(proxy.address().port);
        proxy.close();
        done();
      });
    });

    var tests = [
    { args: { protocol: http, isWhite: false }, expected: { throughs: [ 'proxyA' ] } },
    { args: { protocol: http, isWhite: true }, expected: { throughs: [ 'proxyA' ] } },
    { args: { protocol: https, isWhite: false }, expected: { throughs: [ 'proxyA' ] } },
    { args: { protocol: https, isWhite: true }, expected: { throughs: [ 'proxyA', 'proxyB' ] } }
    ];

    tests.forEach(function (test) {

      var server, proxyA, proxyB;
      var throughs = [];

      var isHttps = (test.args.protocol === https);

      beforeEach(function startServer(done) {
        if (isHttps) {
          server = https.createServer({
            key: fs.readFileSync(path.join(__dirname, 'key.pem')),
            cert: fs.readFileSync(path.join(__dirname, 'cert.pem'))
          });
        } else {
          server = http.createServer();
        }

        server.on('request', function (req, res) {
          res.end();
        });
        server.listen(function () {
          done();
        });
      });

      beforeEach(function startProxyB(done) {
        proxyB = new Proxy();
        proxyB.on('connect', function () {
          throughs.push('proxyB');
        });
        proxyB.listen(function () {
          done();
        });
      });

      beforeEach(function startProxyA(done) {
        proxyA = new Proxy({
          proxyHost: '127.0.0.1',
          proxyPort: proxyB.address().port,
          whiteHosts: test.args.isWhite ? [ '127.0.0.1' ] : []
        });
        proxyA.on('connect', function () {
          throughs.push('proxyA');
        });
        proxyA.listen(function () {
          done();
        });
      });

      it('should be a success to access via ' + (isHttps ? 'https' : 'http') + ' to the host, which ' + (test.args.isWhite ? 'is' : 'isn\'t') + ' a white host' , function (done) {

        var uri = (isHttps ? 'https' : 'http') + '://127.0.0.1:' + server.address().port;

        request({
          uri: uri,
          proxy: 'http://127.0.0.1:' + proxyA.address().port
        }, function(e, r, body) {
          test.expected.throughs.should.eql(throughs);
          done();
        });
      });

      afterEach(function () {
        server.close();
        proxyA.close();
        proxyB.close();
      });
    });

    it('should cause a error', function (done) {
      var server = https.createServer({
        key: fs.readFileSync(path.join(__dirname, 'key.pem')),
        cert: fs.readFileSync(path.join(__dirname, 'cert.pem'))
      }).listen();

      var proxy = new Proxy();
      proxy.listen();
      proxy.on('connect', function () {
        server.close();
        proxy.close();
      });
      proxy.on('error', function (err) {
        err.should.not.be.null;
        done();
      });

      request({
        uri: 'https://127.0.0.1:' + server.address().port,
        proxy: 'http://127.0.0.1:' + proxy.address().port
      }, function() {});
    });

  });
});
