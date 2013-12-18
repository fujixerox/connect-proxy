/*
 * Copyright Fuji Xerox Co., Ltd. 2013 All rights reserved.
 *
 * TCP relay server between local and external using HTTP connect method.
 *   i.e. local <--> internal <--> proxy <--> external
 */
var http         = require('http')
  , net          = require('net')
  , url          = require('url')
  , whitelist    = require('./whitelist.json');

process.on('uncaughtException', function(err) {
  printError(err);
});

if (!process.env.PROXY_HOST || !process.env.PROXY_PORT) {
  printError('require proxy host and port.');
  process.exit(1);
}

var destPort   = 22;
var serverPort = 8081;

var server = http.createServer();
server.on('connect', function(req, socket, head) {
  var dest = url.parse('https://' + req.url);
  console.log('[' + new Date().toUTCString() + '] ' + 'connect from ' + socket.remoteAddress + ' to ' + req.url);

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
  proxy.on('error', function(err) {
    printError(err);
    socket.end();
    proxy.end();
  });
  socket.on('error', function(err) {
    printError(err);
    socket.end();
    proxy.end();
  });
});
server.listen(serverPort, function() {
  console.log('Starting...');
});

function printError(err) {
  console.error('[' + new Date().toUTCString() + '] ' + err);
}
