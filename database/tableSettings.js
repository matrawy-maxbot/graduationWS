import {phone} from 'phone';
import departments from './departments.js';

const checkMinMax = (min, max, val) => {
    try {
        if(typeof val == "string") val = val.length;
        if(val < min) throw `400#You can not set number lower than ${min}`;
        if(val > max) throw `400#You can not set number more than ${max}`;
    } catch (error) {
        throw error;
    }
}

const checkName = (min, max, val) => {
    try {
        if(val.length < min) throw `400#You can not set lower than ${min} characters`;
        if(val.length > max) throw `400#You can not set more than ${max} characters`;
        const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_. ";
        let valArray = val.split("");
        valArray.forEach((a) => {
            if(!alphabet.includes(a)) throw "400#You can not use any character except this 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_.'";
        });
    } catch (error) {
        throw error;
    }
}

const checkPhone = (val) => {
    try {
        const numbers = "0123456789+";
        let valArray = val.split("");
        valArray.forEach((a) => {
            if(!numbers.includes(a)) throw "400#This phone is not valid";
        });

        val = val.replace("+00", "+");
        val = val.replace("+0", "+");
        if(!val.startsWith("+20")) {
            if(val.startsWith("010") || val.startsWith("011") || val.startsWith("012") || val.startsWith("015")) val = "+2" + val;
            if((val.startsWith("10") || val.startsWith("11") || val.startsWith("12") || val.startsWith("15")) && val.length == 10) val = "+20" + val;
        }
        if(val.startsWith("00")) val = val.replace("00", "+");
        if(val.startsWith("0")) val = val.replace("0", "+");
        if(!val.startsWith("+")) val = "+" + val;

        let phoneCheck = phone(val);
        console.log("phoneCheck ::: ", phoneCheck);
        if(!phoneCheck.isValid) throw "400#This phone is not valid";

    } catch (error) {
        throw error;
    }
}

const checkExpertment = (val) => {
    try {

        if(val == "no experience" || val == "no expertment" || val == "no" || val == "none" || val == "null") return;

        let filterVal = val.replace(/\s+/g, "");
        filterVal = filterVal.replace(/[0-9]/g, "");
        filterVal = filterVal.replace(/[abcdefghijklmnopqrstuvwxyz]+/gi, "");
        if(filterVal.length > 0) throw "400#You can not use any character except this 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'";
        filterVal = val.replace(/\s+/g, "");
        filterVal = filterVal.replace(/[0-9]+years/g, "").replace(/[0-9]+year/g, "");
        filterVal = filterVal.replace(/[0-9]+months/g, "").replace(/[0-9]+month/g, "");
        filterVal = filterVal.replace(/[0-9]+days/g, "").replace(/[0-9]+day/g, "");
    
        if(filterVal.length > 0) throw "400#please use this format '2 years'";

    } catch (error) {
        throw error;
    }
}

const checkScheduleTime = (val) => {
    try {

        val = val.toString();
        val = val.replace(/[0-9][0-9]:[0-9][0-9]-[0-9][0-9]:[0-9][0-9]/g, "").replace(/[0-9][0-9]:[0-9][0-9] - [0-9][0-9]:[0-9][0-9]/g, "");
        if(val.length > 0) throw "400#please use this format '08:00-15:00' or '08:00 - 15:00'";

    } catch (error) {
        throw error;
    }
}

const checkTime = (val) => {
    try {

        val = val.toString();
        val = val.replace(/[0-9][0-9]:[0-9][0-9]/g, "");
        if(val.length > 0) throw "400#please use this format '08:00'";

    } catch (error) {
        throw error;
    }
}

const checkDepartment = (val) => {
    try {
        if(!departments[val] && typeof departments[val] !== "number") throw "400#This department is not valid";
    }
    catch (error) {
        throw error;
    }
}

const tableSettings = {
"admins":{
    "name":{"min":3,"max":55,"checkfunc":"checkName"},
    "phone":{"min":9,"max":20,"checkfunc":"checkMinMax", "check":function(val) {
        checkPhone(val.toString());
    }}
    },
"appointments":{
    "name":{"min":3,"max":55,"checkfunc":"checkName"},
    "phone":{"min":8,"max":20,"checkfunc":"checkMinMax", "check":function(val) {
        checkPhone(val.toString());
    }},
    "age":{"min":1,"max":150,"checkfunc":"checkMinMax"},
    "sex":{"min":0,"max":1,"checkfunc":"checkMinMax"},
    "city":{"min":3,"max":30,"checkfunc":"checkMinMax"},
    "description":{"min":9,"max":30000,"checkfunc":"checkMinMax"},
    "photos":{"min":15,"max":1000,"checkfunc":"checkMinMax"},
    "department":{"min":0,"max":20,"checkfunc":"checkMinMax", "check":function(val) {
        checkDepartment(val.toString());
    }},
    "app_date":{"min":3,"max":30,"checkfunc":"checkTime"}
    },
"chat":{
    "content":{"min":0,"max":5000,"checkfunc":"checkMinMax"}
    },
"doctors":{
    "name":{"min":3,"max":55,"checkfunc":"checkName"},
    "phone":{"min":9,"max":20,"checkfunc":"checkMinMax", "check":function(val) {
        checkPhone(val.toString());
    }},
    "speciality":{"min":0,"max":20,"checkfunc":"checkMinMax", "check":function(val) {
        checkDepartment(val.toString());
    }},
    "expertment":{"min":2,"max":20,"checkfunc":"checkMinMax", "check":function(val) {
        checkExpertment(val.toString());
    }}
    },
"notifications":{
    "content":{"min":5,"max":200,"checkfunc":"checkMinMax"}
    },
"ratings":{
    "rating":{"min":1,"max":5,"checkfunc":"checkMinMax"}
    },
"report":{
    "diagnosis":{"min":0,"max":1000,"checkfunc":"checkMinMax"},
    "reasons":{"min":0,"max":3000,"checkfunc":"checkMinMax"},
    "advices":{"min":0,"max":3000,"checkfunc":"checkMinMax"},
    "medicines":{"min":0,"max":2000,"checkfunc":"checkMinMax"},
    "treatments":{"min":0,"max":3000,"checkfunc":"checkMinMax"}
    },
"schedules":{
    "sunday":{"min":7,"max":13,"checkfunc":"checkScheduleTime"},
    "monday":{"min":7,"max":13,"checkfunc":"checkScheduleTime"},
    "tuesday":{"min":7,"max":13,"checkfunc":"checkScheduleTime"},
    "wednesday":{"min":7,"max":13,"checkfunc":"checkScheduleTime"},
    "thursday":{"min":7,"max":13,"checkfunc":"checkScheduleTime"},
    "friday":{"min":7,"max":13,"checkfunc":"checkScheduleTime"},
    "saturday":{"min":7,"max":13,"checkfunc":"checkScheduleTime"}
    },
"users":{
    "name":{"min":3,"max":55,"checkfunc":"checkName"},
    "phone":{"min":9,"max":20,"checkfunc":"checkMinMax", "check":function(val) {
        checkPhone(val.toString());
    }}
    }
}

const checkObj = (table, obj) => {
    try {
        let existTable = tableSettings[table];
        if(existTable) {
            let objKeys = Object.keys(obj);
            objKeys.forEach(ok => {
                let existKey = existTable[ok];
                if(existKey){
                    let existCheckFunc = existKey["checkfunc"];
                    if(existCheckFunc){
                        if(existCheckFunc == "checkMinMax") checkMinMax(existKey["min"], existKey["max"], obj[ok]);
                        if(existCheckFunc == "checkName") checkName(existKey["min"], existKey["max"], obj[ok].toString());
                        if(existCheckFunc == "checkTime") checkTime(obj[ok].toString());
                        if(existCheckFunc == "checkScheduleTime") checkScheduleTime(obj[ok].toString());
                        if(existKey["check"]) {
                            existKey["check"](obj[ok]);
                        }
                    }
                }
            });
        }
    } catch (error) {
        throw error;
    }
}

// Example Usage
/*
checkObj("admins", {name:"gamer", phone:"01552913217"});
checkObj("doctors", {expertment:"2 years", speciality:"16"});
checkObj("appointments", {app_date:"00:00"});
checkObj("schedules", {sunday:"00:00-00:00"});
*/

export { checkObj };