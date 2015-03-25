'use strict';

var http         = require('http')
  , net          = require('net')
  , url          = require('url')
  , util         = require('util')
  , EventEmitter = require('events').EventEmitter
  , WhiteList    = require('./whitelist');

function ConnectProxy(options) {
  var self = this;
  var opts = (options || {});

  // it use this port number,
  // when connect to the host in whitelist without specified port number.
  var destPort = 22;

  var proxy = {
    host: opts.proxyHost,
    port: parseInt(opts.proxyPort, 10)
  };

  function isNotNum(x) {
    return x !== x;
  }

  if (typeof proxy.host !== 'string' || isNotNum(proxy.port)) {
    proxy = null;
  }

  var whitelist = new WhiteList(opts.whiteHosts);

  self.server = http.createServer(function(req, res) {
    self.emit('connect', req);

    var dest = url.parse(req.url);
    var proxyReq = http.request({
      host: dest.hostname,
      port: dest.port,
      path:    req.url,
      method:  req.method,
      headers: req.headers
    }, function(proxyRes) {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });
    req.pipe(proxyReq);
  });

  self.server.on('connect', function(req, socket, head) {
    self.emit('connect', req);

    var dest = url.parse('https://' + req.url);
    var targetHost, targetPort, isWhite;
    if (proxy && whitelist.isWhite(dest.hostname)) {
      targetHost = proxy.host;
      targetPort = proxy.port;
      isWhite    = true;
    } else {
      targetHost = dest.hostname;
      targetPort = dest.port || 443;
      isWhite    = false;
    }

    var proxySocket = net.createConnection(targetPort, targetHost, function() {
      if (isWhite) {
        proxySocket.write('CONNECT ' + dest.hostname + ':' + (dest.port || destPort) + ' HTTP/1.0\r\n\r\n');
      } else {
        socket.write('HTTP/1.0 200 Connection established\r\n\r\n')
      }
      proxySocket.write(head);
      socket.pipe(proxySocket);
      proxySocket.pipe(socket);
    });

    function errorHandler(err) {
      self.emit('error', err);
      socket.end();
      proxySocket.end();
    }

    socket.on('error', errorHandler);
    proxySocket.on('error', errorHandler);
  });
}

util.inherits(ConnectProxy, EventEmitter);

ConnectProxy.prototype.listen = function (port, callback) {
  if (typeof port === 'function' &&
      typeof callback === 'undefined') {
    this.server.listen(port);
  } else {
    this.server.listen(port, callback);
  }
}

ConnectProxy.prototype.address = function () {
  return this.server.address();
}

ConnectProxy.prototype.close = function () {
  this.server.close();
}

module.exports = ConnectProxy;
