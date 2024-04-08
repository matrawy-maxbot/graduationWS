import env from '../config/index.js';
import { sendError } from './events.js';
import statusCodes from '../config/status.js';
import { verifyToken, checkLogin } from '../middleware/authentication.js';

const allowedOrigins = ["localhost:8080", "localhost:9009", "localhost:9010", "graduationws.onrender.com", "graduation-9a7o.onrender.com"];

function originIsAllowed(request, origin) {
    if (request.remoteAddress.includes("::1") || request.remoteAddress.includes("::ffff:127.0.0.1")) return true;
    
    if (!origin) {
        sendError({ status: statusCodes.BAD_REQUEST, message: "You should set origin to access" }, request);
        return false;
    }

    origin = origin.replace(/^https?:\/\//i, "");
    if (allowedOrigins.includes(origin)) return true;
    else {
        sendError({ status: statusCodes.FORBIDDEN, message: "This origin is not allowed" }, request);
        return false;
    }
}


const checkAuthorization = async (request) => {
    try {
        let auth = request.httpRequest.headers.authorization;
        if (!auth) {
            console.log("no auth!");
            throw "Unauthorized";
        }
        
        const authToken = auth.replace(/Bearer/i, "").replace(/\s+/g, "");
        
        if (authToken === env.systemToken) {
            return { id: "0", role: "system" };
        }
        
        console.log("continue!");
        const tkn = verifyToken(authToken);
        
        if (tkn.status) {
            let user = await checkLogin(tkn.data.id, "id");
            if (!user || user.length === 0) {
                throw "User not found";
            }
            return user;
        } else {
            if (tkn.data === "Expired") {
                console.log("error expired!");
                throw "Authorization Token is Expired";
            } else {
                console.log("error bro!");
                throw "Unauthorized";
            }
        }
    } catch (err) {
        throw err;
    }
};


const checkRequest = async (request, refresh = false) => {
    try {

        console.log("Request Origin : ", (request.origin || request.remoteAddress));
        console.log("Request URL : ", request.httpRequest.url);
        console.log("Request Headers : ", request.httpRequest.headers);
        console.log("Request Query : ", request.httpRequest.query);
        let origin = originIsAllowed(request, request.origin);
        if (!origin) throw "This origin is not allowed";
        console.log("Origin is allowed!");
        let auth = await checkAuthorization(request);
        if (!auth) throw "Unauthorized";
        console.log("Authorization is valid!");
        return {origin: origin, user: auth};

    } catch (err) {

        console.error(err);
        sendError({status: statusCodes.UNAUTHORIZED, message: err.toString()}, request);
        return Promise.reject(false);
        
    }
}

export { checkRequest, originIsAllowed, checkAuthorization, allowedOrigins };