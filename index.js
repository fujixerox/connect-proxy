/*
 * Copyright Fuji Xerox Co., Ltd. 2013 All rights reserved.
 *
 * relay server between local and github
 * local <--> internal <--> proxy <--> github
 */

var net  = require('net');

process.on('uncaughtException', function(err) {
  printError(err);
});

if (!process.env.PROXY_HOST || !process.env.PROXY_PORT) {
  printError('require proxy host and port.');
  process.exit(1);
}

net.createServer(function(socket) {
  console.log('[' + new Date().toString() + '] ' + 'connect from ' + socket.remoteAddress);

  var buffer = '';
  socket.on('data', function(data) {
    buffer += data.toString();
    if (buffer.indexOf('\r\n\r\n') > 0) {
      var captures = buffer.match(/^CONNECT ([^:]+):([0-9]+) HTTP\/1\.[01]/);

      if (!captures || captures.length < 2)
        return;
      socket.removeAllListeners('data');

      var host = captures[1];
      var port = captures[2] || 22;

      var proxy = net.createConnection(process.env.PROXY_PORT, process.env.PROXY_HOST, function() {
        proxy.write('CONNECT ' + host + ':' + port + " HTTP/1.0\r\n\r\n");
      });
      socket.pipe(proxy);
      proxy.pipe(socket);
    }
  });

  socket.on('error', function(err) {
    printError(err);
  });
}).listen(8080, function() { console.log('Starting...') });

function printError(err) {
  console.error('[' + new Date().toString() + '] ' + err);
}
