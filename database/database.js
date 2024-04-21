import { createPool } from 'mysql2';
import env from '../config/index.js';

class DatabaseOperationQueue {
    constructor() {
        this.operations = [];
        this.isExecuting = false;
    }

    enqueueOperation(operation) {
        return new Promise(async (resolve, reject) => {
            try {
                this.operations.push({ operation, resolve, reject });
                if (!this.isExecuting) {
                    await this.executeNextOperation();
                }
            } catch (error) {
                reject(error);
            }
        });
    }

    async executeNextOperation() {
        if (this.operations.length > 0) {
            const { operation, resolve, reject } = this.operations[0];
            this.isExecuting = true;

            try {
                console.log('Executing operation:', operation);
                await operation.execute();
                console.log('Operation executed successfully:', operation);

                this.operations.shift();
                resolve();
            } catch (error) {
                console.error('Error executing operation:', error);
                this.isExecuting = false;
                this.operations.shift();
                reject(error);
            } finally {
                this.isExecuting = false;

                if (this.operations.length > 0) {
                    this.executeNextOperation();
                }
            }
        }
    }
}

class Database {

    #host;
    #user;
    #password;
    #database;
    #operationQueue;
    #port;
    pool;

    constructor(host, user, password, port, database = env.db.database) {

        this.#host = host;
        this.#user = user;
        this.#password = password;
        this.#database = database;
        this.#port = port;

        this.pool = createPool({
            connectionLimit: 10,
            host: this.#host,
            user: this.#user,
            password: this.#password,
            database: this.#database,
            port: this.#port
        });

        this.pool.on('connection', (connection) => {
            console.log('New database connection established!');
        });

        this.pool.on('acquire', (connection) => {
            //console.log('Connection acquired: ', connection.threadId);
        });

        this.pool.on('enqueue', () => {
            console.log('Waiting for available connection slot');
        });

        this.pool.on('release', (connection) => {
            //console.log('Connection released: ', connection.threadId);
        });

        this.#operationQueue = new DatabaseOperationQueue();
    }

    query(sql, values, multiple = false) {
        return new Promise((resolve, reject) => {
            this.pool.getConnection((err, connection) => {
                if (err) {
                    reject(err);
                    return;
                }
                if(multiple) {
                    let queries = sql.split(';');
                    queries.pop();
                    for (let i = 0; i < queries.length; i++) {
                        connection.query(queries[i], (error, results, fields) => {
                            if (error) {
                                reject(error);
                                return;
                            }
                            if(i == queries.length - 1) {
                                resolve(results);
                            }
                        });
                    }
                } else {
                    connection.query(sql, values, (error, results, fields) => {
                        connection.release();
                        if (error) {
                            reject(error);
                            return;
                        }
                        resolve(results);
                    });
                }
            });
        });
    }

    escape(sql) {
        return new Promise((resolve, reject) => {
            this.pool.getConnection((err, connection) => {
                if (err) {
                    reject(err);
                    return;
                }
                let results = connection.escape(sql);
                resolve(results);
            });
        });
    }

    async isDataExists(table, data, once_at_least = false) {
        try {
            let dataKeys = Object.keys(data).map(d => d + " = ?");
            if(once_at_least) {
                dataKeys = dataKeys.join(" OR ");
            } else {
                dataKeys = dataKeys.join(" AND ");
            }
            const dataValues = Object.values(data);
    
            const sql = `SELECT COUNT(*) as count FROM ${table} WHERE ${dataKeys}`;
    
            const result = await this.query(sql, dataValues);
            return result[0].count > 0;
        } catch (error) {
            console.error("Error checking if data exists:", error);
            this.close(true);
            throw error;
        }
    }

    async getUniqueFields(table) {
        const sql = `SHOW INDEXES FROM ${table}`;
    
        try {
            let result = await this.query(sql);
            result = result.filter(r => !r.Non_unique);
            return Array.from(result.reduce((map, e) => map.set(e.Column_name, e), new Map()).values()).map(e => e.Column_name);
        } catch (error) {
            console.error("Error fetching unique fields:", error);
            this.close(true);
            throw error;
        }
    }

    async select(table, columns = '*', condition, add_query) {
        const columnList = Array.isArray(columns) ? columns.join(', ') : columns;
        let conditionString = typeof condition == 'object' ? "WHERE ? " : "";
        conditionString = typeof condition == 'string' ? "WHERE " + condition : "";
        switch (typeof condition) {
            case 'object':
                conditionString = "WHERE ? ";
                break;
            case 'string':
                conditionString = "WHERE " + condition;
                break;
            default:
                conditionString = "";
                break;
        }
        add_query = add_query ? this.pool.escape(add_query) : "";
        const sql = `SELECT ${columnList} FROM ${table} ${conditionString}${add_query}`;
      
        try {
            var result;
            if(typeof condition == 'object') {
                result = await this.query(sql, condition);
            } else {
                result = await this.query(sql);
            }
            return result;
        } catch (error) {
            await this.close(true);
            throw error;
        }
    }

    async insert(table, data, add_query = "") {
        add_query = add_query ? this.pool.escape(add_query) : "";
    
        try {
            const dataKeys = Object.keys(data).join(", ");
            const dataValues = Object.values(data);
            const datavaluesQM = Object.keys(data).map(d => "?").join(", ");
            const uniqueFields = await this.getUniqueFields(table);
            const whereCondition = uniqueFields.map(d => d + " = ?").join(" OR ");
            const conditionValues = uniqueFields.map(uf => data[uf]);
    
            const sql = `
                INSERT INTO ${table} (${dataKeys})
                SELECT ${datavaluesQM} FROM dual
                WHERE NOT EXISTS (
                    SELECT 1 FROM ${table}
                    WHERE ${whereCondition}
                ) ${add_query}
            `;
            const values = [...dataValues, ...conditionValues];

            await this.#operationQueue.enqueueOperation({
                execute: async () => {
                    let res = await this.query(sql, values);
                    if(res.affectedRows == 0) {
                        console.error('Data already exist.');
                        throw "400#Data already exist.";
                    }
                    console.log('Inserted!');
                }
            });
        } catch (error) {
            console.error("Error inserting user:", error);
            await this.close(true);
            throw error;
        }
    }

    async update(table, data, condition, conditionMulti = "AND", add_query = "") {
        add_query = add_query ? this.pool.escape(add_query) : "";
        let conditionKeys = Object.keys(condition);
        let sql = "";
        if(conditionKeys.length > 1) {
            let escap = await this.escape(condition);
            escap = escap.replace(/, /g, " " + conditionMulti + " ");
            sql = `UPDATE ${table} SET ? WHERE ${escap} ${add_query}`;
            condition = "";
        } else {
            sql = `UPDATE ${table} SET ? WHERE ? ${add_query}`;
        }

        try {
            await this.#operationQueue.enqueueOperation({
                execute: async () => {
                    await this.query(sql, [data, condition]);
                    console.log('Updated!');
                }
            });
        } catch (error) {
            await this.close(true);
            throw error;
        }
    }

    async delete(table, condition, add_query = "") {
        add_query = add_query ? this.pool.escape(add_query) : "";
        const sql = `DELETE FROM ${table} WHERE ? ${add_query}`;

        try {
            await this.#operationQueue.enqueueOperation({
                execute: async () => {
                    await this.query(sql, condition);
                    console.log('Deleted!');
                }
            });
        } catch (error) {
            await this.close(true);
            throw error;
        }
    }

    close(reconnect = false) {
        return new Promise((resolve, reject) => {
            this.pool.getConnection((err, connection) => {
                if (err) {
                    console.error('Error getting a connection to close the database pool:', err);
                    reject(err);
                    return;
                }
                connection.end();
                if (reconnect) {
                    this.pool = createPool({
                        connectionLimit: 10,
                        host: this.#host,
                        user: this.#user,
                        password: this.#password,
                        database: this.#database,
                        port: this.#port
                    });
                }
                resolve();
            });
        });
    }
}

export { Database };
