import statusCodes from '../config/status.js';
import jwt from 'jsonwebtoken';
import env from '../config/index.js';
//import { checkLogin } from '../controllers/login.js';
import { DBselect } from '../database/index.js';

const verifyToken = (token) => {
    try {
        token = token.replace(/Bearer/i, "").replace(/\s+/g, "");
        const header = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9";
        const privateKey = env.privateKEY;
        console.log("privateKey :|: ", privateKey)
        const tkn = jwt.verify(header + "." + token, privateKey);
        console.log("tkn :|: ", tkn)
        return {status:true, data:tkn};
    } catch (error) {
        console.log("Error tkn :|: ", error)
        let errorMessage = "";
        if(error.toString().includes("jwt expired")){

            errorMessage = "Expired";
        } else {
            errorMessage = error;
        }
        return {status:false, data:errorMessage};
    }
}

const checkLogin = async (value, key, res = undefined) => {

    try {

        console.log("key :|: ", key)
        console.log("value :|: ", value)
        let user = await DBselect('admins', '*', {[key]: value}).catch(err => {throw err});
        if(!user) return false;
        let role = "admin";
        if(user.length == 0) {
            user = await DBselect('doctors', '*', {[key]: value}).catch(err => {throw err});
            if(!user) return false;
            role = "doctor";
        }
        if(user.length == 0) {
            user = await DBselect('users', '*', {[key]: value}).catch(err => {throw err});
            if(!user) return false;
            role = "user";
        }
        if(user.length == 0) {
            return false;
        }
        user[0].role = role;
        return user[0];
        
    } catch (error) {

        console.error(error);
        return false;
        
    }
    
}   

export {
    verifyToken,
    checkLogin,
};