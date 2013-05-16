#------------------------------------------------------
# 
# noda shinpei 
# 2015/5/16
# relay server between local and github
# local <--> git.rdh <--> enterprise proxy <--> github
#
#------------------------------------------------------

process.on('uncaughtException', function(err) {
    console.log(err.stack);
});

var net  = require('net');
var server = net.createServer(function(socket) {
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

            var proxy = net.createConnection(8080, '129.249.115.194', function() {
                proxy.write('CONNECT ' + host + ':' + port + " HTTP/1.0\r\n\r\n");
            });
            socket.pipe(proxy);
            proxy.pipe(socket);
        }
    });
});
server.listen(8080);
