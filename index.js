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
var whiteHosts   = require('./whitelist.json')
  , ConnectProxy = require('./lib/connect-proxy')

process.on('uncaughtException', function(err) {
  printError(err);
});

if (!process.env.PROXY_HOST || !process.env.PROXY_PORT) {
  printError('require proxy host and port.');
  process.exit(1);
}

var proxy = new ConnectProxy({
  proxyHost: process.env.PROXY_HOST,
  proxyPort: process.env.PROXY_PORT,
  whiteHosts: whiteHosts
});
proxy.on('connect', printConnectLog);
proxy.on('error', printError);
proxy.listen(8080, function() {
  console.log('Starting...');
});

function printError(err) {
  console.error('[' + new Date().toUTCString() + '] ' + err);
}

function printConnectLog(req) {
  var address = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  console.log('[' + new Date().toUTCString() + '] ' + 'connect from ' + address + ' to ' + req.url);
}
