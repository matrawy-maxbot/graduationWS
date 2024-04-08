import { Database } from './database.js';
import { checkObj } from './tableSettings.js';
import env from '../config/index.js';
import { fileURLToPath } from 'url';
import path from 'path';
import { fileTypeFromBuffer } from 'file-type';

const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = path.dirname(__filename); // get the directory name from the file path

const dbClient = new Database(env.db.host, env.db.user, env.db.password, env.db.port, env.db.database);

const DBselect = async (table, columns, condition, add_query) => {
    return new Promise(async (resolve, reject) => {
        try {

            // Example usage:
            /*
            table = 'your_table';
            columns = ['column1', 'column2'];
            condition = { id: 1 };
            add_query = 'ORDER BY column1 DESC';
            */

            const result = await dbClient.select(table, columns, condition, add_query);
            resolve(result);
        } catch (error) {
            reject(error);
        }
    });
}

const DBinsert = async (table, data, add_query) => {
    return new Promise(async (resolve, reject) => {
        try {

            // Example usage:
            /*
            table = 'your_table';
            data = {
                column1: 'value1',
                column2: 'value2',
                // Add more columns and values as needed
            };
            add_query = 'ON DUPLICATE KEY UPDATE column1 = VALUES(column1)'; // Optional additional query
            */

            let check = await checkBodyDB(table, data).catch(err => { return err; });
            if(check.toString().includes("Types mismatch")) reject(check);

            checkObj(table, data);

            console.log("roooooooooof");

            await dbClient.insert(table, data, add_query);
            resolve(true);
        } catch (error) {
            reject(error);
        }
    });
}

const DBupdate = async (table, data, condition, conditionMulti = "AND", add_query) => {
    return new Promise(async (resolve, reject) => {
        try {

            // Example usage:
            /*
            table = 'your_table';
            data = {
                column1: 'new_value',
                // Add more columns and values as needed
            };
            condition = {
                id: 1, // Specify the condition for the WHERE clause
            };
            add_query = 'LIMIT 1'; // Optional additional query
            */

            let check = await checkBodyDB(table, data).catch(err => { return err; });
            if(check.toString().includes("Types mismatch")) reject(check);

            checkObj(table, data);

            await dbClient.update(table, data, condition, conditionMulti, add_query);
            resolve(true);
        } catch (error) {
            reject(error);
        }
    });
}

const DBdelete = async (table, condition, add_query) => {
    return new Promise(async (resolve, reject) => {
        try {

            // Example usage:
            /*
            table = 'your_table';
            condition = {
                id: 1, // Specify the condition for the WHERE clause
            };
            add_query = 'LIMIT 1';
            */

            await dbClient.delete(table, condition, add_query);
            resolve(true);
        } catch (error) {
            reject(error);
        }
    });
}

const DBquery = async (sql, values) => {
    return new Promise(async (resolve, reject) => {
        try {

            // Example usage:
            /*
            sql = 'SELECT * FROM your_table WHERE id = ?';
            values = [1];
            */

            const q = await dbClient.query(sql, values);
            resolve(q);
        } catch (error) {
            reject(error);
        }
    });
}

function sqlToJsType(sqlType) {
    switch (sqlType.toUpperCase()) {
        case 'CHAR':
        case 'VARCHAR':
        case 'TINYTEXT':
        case 'MEDIUMTEXT':
        case 'TEXT':
        case 'LONGTEXT':
            return 'string';

        case 'INT':
        case 'SMALLINT':
        case 'BIGINT':
        case 'DECIMAL':
        case 'NUMERIC':
        case 'FLOAT':
        case 'REAL':
        case 'DOUBLE':
            return 'number';

        case 'DATE':
        case 'TIME':
        case 'DATETIME':
        case 'TIMESTAMP':
            return 'string';

        case 'BOOLEAN':
            return 'boolean';

        case 'JSON':
            return 'object';

        default:
            return 'undefined';
    }
}

const DBObjectValues = async (table, object) => {
    return new Promise(async (resolve, reject) => {
        try {

            let objectTypes = Object.keys(object).reduce((acc, cur) => {
                acc[cur] = (typeof object[cur]).toLowerCase();
                return acc;
            }, {});
        
            let dbQuery = `SELECT COLUMN_NAME as name, DATA_TYPE as type FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = '${table}'`;
            let tableTypes = await dbClient.query(dbQuery);
            tableTypes = tableTypes.reduce((acc, cur) => {
                acc[cur.name] = (sqlToJsType(cur.type)).toLowerCase();
                return acc;
            }, {});
        
            resolve({ obj: objectTypes, table:tableTypes });

        } catch (error) {
            reject(error);
        }
    });
};

const checkValues = async (table, object) => {
    return new Promise(async (resolve, reject) => {
        try {
            let values = await DBObjectValues(table, object);
            let objKeys = Object.keys(values.obj);
            let tableKeys = Object.keys(values.table);
            values.table = tableKeys.reduce((acc, cur) => {
                if(objKeys.includes(cur)) acc[cur] = values.table[cur];
                return acc;
            }, {});
            values.obj = objKeys.reduce((acc, cur) => {
                if(tableKeys.includes(cur)) acc[cur] = values.obj[cur];
                return acc;
            }, {});
            let newobjKeys = Object.keys(values.obj);
            let message = "Types mismatch :";
            newobjKeys.forEach(key => {
                if(key == 'file' || key == 'avatar') return;
                if(values.obj[key] != values.table[key]) {
                    message += `\nfor column ${key}. Expected ${values.table[key]}, got ${values.obj[key]}`;
                }
            });
            if(message != "Types mismatch :") reject(message);
            resolve(true);
        } catch (error) {
            reject(error);
        }
    });

}

const checkBodyDB = async (table, object) => {
    return new Promise(async (resolve, reject) => {
        try {
            let check = await checkValues(table, object);
            if(check) resolve(true);
        } catch (error) {
            reject(error);
        }
    });
}

const DBinit = async (insertTestValues = false) => {
    try {

        let sql = `

        CREATE TABLE IF NOT EXISTS \`admins\` (
            \`id\` varchar(17) NOT NULL PRIMARY KEY,
            \`name\` varchar(55) NOT NULL,
            \`phone\` varchar(20) NOT NULL UNIQUE,
            \`pass\` varchar(100) NOT NULL,
            \`avatar\` varchar(50) DEFAULT NULL,
            \`created_at\` timestamp NOT NULL DEFAULT current_timestamp()
        );
        

        CREATE TABLE IF NOT EXISTS \`appointments\` (
            \`id\` varchar(17) NOT NULL PRIMARY KEY,
            \`name\` varchar(55) NOT NULL,
            \`phone\` varchar(20) NOT NULL,
            \`age\` int(2) NOT NULL,
            \`sex\` int(1) NOT NULL DEFAULT 0 COMMENT \'0 for Male, 1 for Female\',
            \`city\` varchar(30) DEFAULT NULL,
            \`description\` mediumtext DEFAULT NULL,
            \`photos\` varchar(1000) DEFAULT NULL,
            \`owner_id\` varchar(17) NOT NULL,
            \`doctor_id\` varchar(17) NOT NULL,
            \`department\` int(2) NOT NULL,
            \`app_date\` varchar(10) NOT NULL,
            \`created_at\` timestamp NOT NULL DEFAULT current_timestamp()
        );

        
        CREATE TABLE IF NOT EXISTS \`chat\` (
            \`id\` varchar(17) NOT NULL PRIMARY KEY,
            \`source\` varchar(17) NOT NULL,
            \`destination\` varchar(17) NOT NULL,
            \`content\` text DEFAULT NULL,
            \`file\` varchar(200) DEFAULT NULL,
            \`created_at\` timestamp NOT NULL DEFAULT current_timestamp()
        );   


        CREATE TABLE IF NOT EXISTS \`doctors\` (
            \`id\` varchar(17) NOT NULL PRIMARY KEY,
            \`name\` varchar(55) NOT NULL,
            \`phone\` varchar(20) NOT NULL UNIQUE,
            \`pass\` varchar(100) NOT NULL,
            \`avatar\` varchar(50) DEFAULT NULL,
            \`speciality\` int(2) NOT NULL,
            \`expertment\` varchar(20) NOT NULL,
            \`created_at\` timestamp NOT NULL DEFAULT current_timestamp()
        );   
        

        CREATE TABLE IF NOT EXISTS \`notifications\` (
            \`id\` varchar(17) NOT NULL PRIMARY KEY,
            \`source\` varchar(17) NOT NULL,
            \`destination\` varchar(17) NOT NULL,
            \`content\` text NOT NULL,
            \`created_at\` timestamp NOT NULL DEFAULT current_timestamp()
        );     


        CREATE TABLE IF NOT EXISTS \`ratings\` (
            \`id\` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
            \`doctor_id\` varchar(17) NOT NULL,
            \`user_id\` varchar(17) NOT NULL,
            \`rating\` tinyint(1) NOT NULL,
            \`created_at\` timestamp NOT NULL DEFAULT current_timestamp()
        );


        CREATE TABLE IF NOT EXISTS \`report\` (
            \`id\` varchar(17) NOT NULL PRIMARY KEY,
            \`doctor_id\` varchar(17) NOT NULL,
            \`appointment_id\` varchar(17) NOT NULL,
            \`user_id\` varchar(17) NOT NULL,
            \`diagnosis\` text DEFAULT NULL,
            \`reasons\` text DEFAULT NULL,
            \`advices\` text DEFAULT NULL,
            \`medicines\` text DEFAULT NULL,
            \`treatments\` text DEFAULT NULL,
            \`created_at\` timestamp NOT NULL DEFAULT current_timestamp()
        );    
        

        CREATE TABLE IF NOT EXISTS \`schedules\` (
            \`doctor_id\` varchar(17) NOT NULL PRIMARY KEY,
            \`sunday\` varchar(12) DEFAULT NULL,
            \`monday\` varchar(12) DEFAULT NULL,
            \`tuesday\` varchar(12) DEFAULT NULL,
            \`wednesday\` varchar(12) DEFAULT NULL,
            \`thursday\` varchar(12) DEFAULT NULL,
            \`friday\` varchar(12) DEFAULT NULL,
            \`saturday\` varchar(12) DEFAULT NULL
        );    
        

        CREATE TABLE IF NOT EXISTS \`users\` (
            \`id\` varchar(17) NOT NULL PRIMARY KEY,
            \`name\` varchar(55) NOT NULL,
            \`phone\` varchar(20) NOT NULL UNIQUE,
            \`pass\` varchar(100) NOT NULL,
            \`avatar\` varchar(50) DEFAULT NULL,
            \`created_at\` timestamp NOT NULL DEFAULT current_timestamp()
        );

        `;

        let insertSQL = `
        
        INSERT INTO \`admins\` (id, name, phone, pass, avatar) 
        VALUES 
        (12345, 'Alice Johnson', '+1234567890', 'alice_pass123', 'https://example.com/alice_avatar.jpg'),
        (54321, 'Bob Smith', '+1987654321', 'bob_password!', 'https://example.com/bob_avatar.jpg'),
        (98765, 'Emily Davis', '+1122334455', 'emily1234', 'https://example.com/emily_avatar.jpg'),
        (24680, 'Michael Brown', '+5555555555', 'mike_pass_123', 'https://example.com/michael_avatar.jpg'),
        (13579, 'Sophia Wilson', '+9876543210', 'sophiaPass!', 'https://example.com/sophia_avatar.jpg');

        INSERT INTO \`appointments\` (id, name, phone, age, sex, city, description, photos, owner_id, doctor_id, department, app_date) 
        VALUES 
        (1001, 'John Doe', '+1234567890', 35, 0, 'New York', 'Regular check-up', 'https://example.com/photo1.jpg,https://example.com/photo2.jpg', 24601, 13579, 0, '2024-03-03'),
        (1002, 'Jane Smith', '+1987654321', 28, 1, 'Los Angeles', 'Allergic reactions', 'https://example.com/photo3.jpg', 13579, 98765, 1, '2024-03-04'),
        (1003, 'Michael Johnson', '+1122334455', 45, 0, 'Chicago', 'Back pain issues', 'https://example.com/photo4.jpg', 98765, 54321, 2, '2024-03-05'),
        (1004, 'Emily Brown', '+5555555555', 20, 1, 'Houston', 'Dental consultation', 'https://example.com/photo5.jpg,https://example.com/photo6.jpg', 54321, 24680, 3, '2024-03-06'),
        (1005, 'David Wilson', '+9876543210', 50, 0, 'San Francisco', 'Vision problems', 'https://example.com/photo7.jpg', 12345, 12345, 4, '2024-03-07');

        INSERT INTO \`chat\` (id, source, destination, content, file) 
        VALUES 
        (2001, 12345, 13579, 'Hi Elena, I would like to schedule an appointment for next week.', NULL),
        (2002, 54321, 24680, 'Dr. Wilson, could you please review my latest test results?', 'attachment1.pdf'),
        (2003, 98765, 24601, 'Laura, can you confirm my appointment time for tomorrow?', NULL),
        (2004, 13579, 54321, 'Bob, I need to reschedule our meeting to Friday afternoon.', NULL),
        (2005, 24680, 12345, 'Alice, could you provide me with more details about the upcoming event?', NULL);

        INSERT INTO \`doctors\` (id, name, phone, pass, avatar, speciality, expertment) 
        VALUES 
        (13579, 'Elena Rodriguez', '+1122334455', 'elena_pass123', 'https://example.com/elena_avatar.jpg', 'Computer Science', 'Machine Learning'),
        (98765, 'Daniel Garcia', '+1234567890', 'daniel_password!', 'https://example.com/daniel_avatar.jpg', 'Electrical Engineering', 'Robotics'),
        (54321, 'Sophie Clark', '+1987654321', 'sophie1234', 'https://example.com/sophie_avatar.jpg', 'Biotechnology', 'Genetic Engineering'),
        (24680, 'James Wilson', '+5555555555', 'james_pass_123', 'https://example.com/james_avatar.jpg', 'Medicine', 'Clinical Trials'),
        (12345, 'Isabella Brown', '+9876543210', 'isabellaPass!', 'https://example.com/isabella_avatar.jpg', 'Physics', 'Quantum Mechanics');

        INSERT INTO \`notifications\` (id, source, destination, content) 
        VALUES 
        (3001, 12345, 13579, 'Hi Elena, I would like to schedule an appointment for next week.'),
        (3002, 54321, 24680, 'Dr. Wilson, could you please review my latest test results?'),
        (3003, 98765, 24601, 'Laura, can you confirm my appointment time for tomorrow?'),
        (3004, 13579, 54321, 'Bob, I need to reschedule our meeting to Friday afternoon.'),
        (3005, 24680, 12345, 'Alice, could you provide me with more details about the upcoming event?');

        INSERT INTO \`ratings\` (id, doctor_id, user_id, rating) 
        VALUES 
        (4001, 13579, 12345, 4.5),
        (4002, 24680, 54321, 3.8),
        (4003, 24601, 98765, 4.2),
        (4004, 54321, 13579, 4.0),
        (4005, 12345, 24680, 4.7);

        INSERT INTO \`report\` (id, doctor_id, appointment_id, user_id, diagnosis, reasons, advices, medicines, treatments) 
        VALUES 
        (5001, 13579, 1001, 24601, 'High blood pressure', 'Routine check-up', 'Increase physical activity, reduce sodium intake', 'Lisinopril, Hydrochlorothiazide', 'Regular exercise, dietary changes'),
        (5002, 98765, 1002, 13579, 'Allergic rhinitis', 'Seasonal allergies', 'Avoid allergens, nasal corticosteroids', 'Fluticasone nasal spray', 'Avoid allergens, medication as needed'),
        (5003, 54321, 1003, 98765, 'Lumbar strain', 'Prolonged sitting, heavy lifting', 'Physical therapy, pain management', 'Ibuprofen, Heat therapy', 'Physical therapy sessions, rest'),
        (5004, 24680, 1004, 54321, 'Cavity detected', 'Toothache, sensitivity', 'Dental filling, oral hygiene', 'Composite filling material', 'Dental filling procedure, oral hygiene instructions'),
        (5005, 12345, 1005, 12345, 'Myopia', 'Blurry vision, difficulty focusing', 'Corrective lenses, eye exercises', 'Prescription eyeglasses', 'Regular eye exams, use of prescribed eyewear');
    
        INSERT INTO \`schedules\` (doctor_id, sunday, monday, tuesday, wednesday, thursday, friday, saturday) 
        VALUES 
        (13579, '08:00-12:00', '09:00-13:00', '08:30-12:30', '09:30-13:30', '08:00-12:00', '09:00-13:00', NULL),
        (24680, '10:00-14:00', NULL, '10:30-14:30', '09:00-13:00', '08:30-12:30', '09:00-13:00', '10:00-14:00'),
        (54321, '08:00-12:00', '08:30-12:30', '09:00-13:00', '08:00-12:00', '09:30-13:30', '08:30-12:30', '08:00-12:00'),
        (98765, '09:00-13:00', '08:00-12:00', '09:30-13:30', '08:30-12:30', '09:00-13:00', '08:00-12:00', '09:00-13:00'),
        (12345, NULL, '08:00-12:00', '09:00-13:00', '08:30-12:30', '09:00-13:00', '08:00-12:00', '09:00-13:00');

        INSERT INTO \`users\` (id, name, phone, pass, avatar) 
        VALUES 
        (24601, 'Laura White', '+1122334455', 'laura_pass123', 'https://example.com/laura_avatar.jpg'),
        (13579, 'David Miller', '+1234567890', 'david_password!', 'https://example.com/david_avatar.jpg'),
        (98765, 'Emma Thompson', '+1987654321', 'emma1234', 'https://example.com/emma_avatar.jpg'),
        (54321, 'Kevin Lee', '+5555555555', 'kevin_pass_123', 'https://example.com/kevin_avatar.jpg'),
        (12345, 'Rachel Adams', '+9876543210', 'rachelPass!', 'https://example.com/rachel_avatar.jpg');

        `;

        //await dbClient.query('CREATE DATABASE IF NOT EXISTS ' + databaseName);
        sql = await dbClient.escape(sql.replace(/\n/g, "").replace(/\s+/g, " "));
        sql = sql.slice(1, -1).replace(/\\/g, "");
        await dbClient.query(sql, [], true);
        if(insertTestValues) {
            insertSQL = await dbClient.escape(insertSQL.replace(/\n/g, "").replace(/\s+/g, " "));
            insertSQL = insertSQL.slice(1, -1).replace(/\\/g, "");
            await dbClient.query(insertSQL, [], true);
        }
        return true;
    } catch (error) {
        console.error('Error selecting:', error);
    }
}

function getFileType(fileBuffer) {
    return new Promise(async (resolve, reject) => {
      try {
        fileBuffer = Buffer.from(fileBuffer);
        console.log("fileBuffer: ", fileBuffer);
        const fileInfo = fileTypeFromBuffer(fileBuffer);
        if(!fileInfo) reject('Invalid file type');
        resolve(fileInfo);
      } catch (error) {
        reject(error);
      }
    });
  }

const uploadFile = async (file, name, pth, type) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!file) {
                reject('No file provided');
            }

            let fileName = name;
            let fileType = "";

            if(file.size > (10*1024*1024)) reject('File size exceeds 10MB.');

            if(type == 'image') {
                let fileOptions = await getFileType(file.data).catch(err => { reject(err); });
                let fileExtensions = ["jpg", "jpeg", "png", "webp"];
                if (!fileOptions || !fileOptions.ext) {
                    reject('Invalid image file.');
                    return;
                }
                console.log("done file type check.",   fileExtensions.includes(fileOptions.ext));
                if(!fileExtensions.includes(fileOptions.ext)) {
                    console.log("fileOptions.ext: ", fileOptions.ext);
                    reject('You can only upload jpg, jpeg, webp or png files.');
                    return;
                }
                console.log("done file extension check.");
                fileType = "." + fileOptions.ext;
                console.log("fileType: ", fileType);
            }

            else if(type == 'any') {
                let fileOptions = await getFileType(file.data).catch(err => { reject(err); });
                let fileExtensions = ["jpg", "jpeg", "png", "webp", "gif", "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "zip", "rar", "7z", "tar", "gz", "mp3", "wav"];
                if(!fileExtensions.includes(fileOptions.ext)) {
                    reject('This file type is not supported.');
                }
                fileType = "." + fileOptions.ext;
            }

            let uploadPath = path.join(__dirname, "../" + pth, fileName + fileType);

            file.mv(uploadPath, (error) => {
                if (error) {
                    reject(error);
                } else resolve(fileName + fileType);
            });
        } catch (error) {
            reject(error);
        }
    });
}

export { DBquery, DBselect, DBinsert, DBupdate, DBdelete, DBinit, checkBodyDB, uploadFile};
