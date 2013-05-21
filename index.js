/*
 * Copyright Fuji Xerox Co., Ltd. 2013 All rights reserved.
 *
 * TCP relay server between local and external using HTTP connect method.
 *   i.e. local <--> internal <--> proxy <--> external
 */
var http = require('http');
var net  = require('net');
var url  = require('url');

process.on('uncaughtException', function(err) {
  printError(err);
});

if (!process.env.PROXY_HOST || !process.env.PROXY_PORT) {
  printError('require proxy host and port.');
  process.exit(1);
}

var destPort = 22;
var port = 8080;

http.createServer().on('connect', function(req, socket, head) {
  var dest = url.parse('http://' + req.url);
  console.log('[' + new Date().toString() + '] ' + 'connect from ' + socket.remoteAddress + ' to ' + req.url);
  var proxy = net.createConnection(process.env.PROXY_PORT, process.env.PROXY_HOST, function() {
    proxy.write('CONNECT ' + dest.host + ':' + (dest.port || destPort) + " HTTP/1.0\r\n\r\n");
    proxy.write(head);
    socket.pipe(proxy);
    proxy.pipe(socket);
  });
  proxy.on('error', function(err) {
    printError(err);
  });
}).listen(port, function() { console.log('Starting...'); });

function printError(err) {
  console.error('[' + new Date().toString() + '] ' + err);
}
