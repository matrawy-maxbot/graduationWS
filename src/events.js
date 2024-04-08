import { EventEmitter } from 'node:events';

const event = new EventEmitter();

const sendEvent = (eventName, message, request) => {
    try {
        message = {event:eventName, data:message, time:Date.now()};
        message = JSON.stringify(message);
        if(request) request.sendUTF(message);
        else event.emit(eventName, message);
    } catch (error) {
        console.error(error);
    }
};

const sendError = (error, request) => {
    try {
        error = {event:"error", data:error, time:Date.now()};
        error = JSON.stringify(error);
        console.log("Error : ", error);
        var connection = request.accept('echo-protocol', request.origin);
        connection.sendUTF(error);
        connection.close();
    } catch (error) {
        console.error(error);
    }
};

const listenSocketRequest = (connection, request) => {
    try {

        event.on('createMessage', function(message) {
            if(connection.connected) {
                let user = connection.owner.user;
                let messageData = JSON.parse(message).data;
                messageData = messageData.data || messageData;
                if(messageData.source == user.id || messageData.destination == user.id) {
                    connection.sendUTF(message);
                }
            }
        });

        event.on('createNotification', function(message) {
            if(connection.connected) {
                let user = connection.owner.user;
                let messageData = JSON.parse(message).data;
                if(messageData.source == user.id || messageData.destination == user.id) {
                    connection.sendUTF(message);
                }
            }
        });

    } catch (error) {
        console.error(error);
    }
};

export { event, listenSocketRequest, sendEvent, sendError };