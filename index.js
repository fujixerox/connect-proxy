/*
 * Copyright Fuji Xerox Co., Ltd. 2013-2014 All rights reserved.
 *
 * If domain of target server is defined in white list, tis proxy server provides SSH connectivity
 * between internal client and external server using HTTP connect method.
 *   i.e. client <-SSH over HTTP-> this proxy <-SSH over HTTP-> upstream proxy <-SSH-> external ssh server.
 *
 * Otherwise, this server relays HTTP packets to internal git server.
 *   i.e. client <-HTTP-> this proxy <-HTTP-> internal git server.
 */
var http      = require('http')
  , net       = require('net')
  , url       = require('url')
  , whitelist = require('./whitelist.json');

process.on('uncaughtException', function(err) {
  printError(err);
});

if (!process.env.PROXY_HOST || !process.env.PROXY_PORT) {
  printError('require proxy host and port.');
  process.exit(1);
}

var destPort   = 22;
var serverPort = 8080;

var server = http.createServer(function(req, res) {
  printConnectLog(req);

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

server.on('connect', function(req, socket, head) {
  printConnectLog(req);

  var dest = url.parse('https://' + req.url);
  var targetHost, targetPort, isWhite;
  if (whitelist.indexOf(dest.hostname) === -1) {
    targetHost = dest.hostname;
    targetPort = dest.port || 443;
    isWhite    = false;
  } else {
    targetHost = process.env.PROXY_HOST;
    targetPort = process.env.PROXY_PORT;
    isWhite    = true;
  }

  var proxy = net.createConnection(targetPort, targetHost, function() {
    if (isWhite) {
      proxy.write('CONNECT ' + dest.hostname + ':' + (dest.port || destPort) + ' HTTP/1.0\r\n\r\n');
    } else {
      socket.write('HTTP/1.0 200 Connection established\r\n\r\n')
    }
    proxy.write(head);
    socket.pipe(proxy);
    proxy.pipe(socket);
  });

  function errorHandler(err) {
    printError(err);
    socket.end();
    proxy.end();
  }

  socket.on('error', errorHandler);
  proxy.on('error', errorHandler);
});

server.listen(serverPort, function() {
  console.log('Starting...');
});

function printError(err) {
  console.error('[' + new Date().toUTCString() + '] ' + err);
}

function printConnectLog(req) {
  var address = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  console.log('[' + new Date().toUTCString() + '] ' + 'connect from ' + address + ' to ' + req.url);
}
