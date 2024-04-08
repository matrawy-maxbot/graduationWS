import { server as WebSocketServer } from 'websocket';
import { requestFunction } from './src/init.js';
import { createServer } from 'http';
import statusCodes from './config/status.js';

const createSocket = (port) => {

    var server = createServer(function(request, response) {
        console.log("\n-------------------------------\n" + (new Date()) + ' Received request for ' + request.url + "\n-------------------------------\n");
        response.writeHead(statusCodes.OK);
        response.end();
    });

    server.listen(port, function() {
        console.log('# Server is listening on port ' + port);
    });

    const wsServer = new WebSocketServer({
        httpServer: server,
        autoAcceptConnections: false
    });

    wsServer.on('request', requestFunction);

}

createSocket(4000);