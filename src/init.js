import { checkAuthorization, checkRequest } from './config.js';
import { listenSocketRequest } from './events.js';
import { event, sendEvent } from './events.js';
import { randomBytes } from 'crypto';
import env from '../config/index.js';

const requestFunction = async (request) => {
    try {

        console.log("there is a request for websocket!", request.origin, request.remoteAddress);

        const connectionId = randomBytes(32).toString('hex');

        request.id = connectionId;

        const requestOwner = await checkRequest(request, false).catch(err => {if(err) console.error(err);return false;});
        if(!requestOwner) return;

        console.log("Request Owner : ", requestOwner);

        var connection = request.accept();
        console.log((new Date()) + ' Connection from origin ' + (request.origin || request.remoteAddress) + ' accepted.');

        connection.owner = requestOwner;

        connection.sendUTF(JSON.stringify({event:"connected", data:{request_id:request.id, time:Date.now()}}));

        listenSocketRequest(connection, request);

        connection.on('message', function(message) {
            if (message.type === 'utf8') {

                console.log('Received Message: ' + message.utf8Data);
                let data = JSON.parse(message.utf8Data);

                console.log("data :|: ", data);
                console.log("event :|: ", data.event);
                console.log("systemAuth :|: ", data.systemAuth, env.websocketToken);

                if(data.event == "createMessage") {
                    if(data.systemAuth !== env.websocketToken) {
                        sendEvent("createMessage", {event:"error", data:{message:data}});
                        return;
                    }
                    sendEvent("createMessage", data);
                } else if(data.event == "createNotification") {
                    if(data.systemAuth !== env.websocketToken) {
                        sendEvent("createNotification", {event:"error", data:{message:data}});
                        return;
                    }
                    sendEvent("createNotification", data);
                }

            }
            else if (message.type === 'binary') {
                console.log('Received Binary Message of ' + message.binaryData.length + ' bytes');
            }
        });

        connection.on('close', function(reasonCode, description) {
            console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
        });
        
    } catch (error) {
        console.error(error);
    }
};

export { requestFunction };