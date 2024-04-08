import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomBytes } from 'crypto';

const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = path.dirname(__filename); // get the directory name from the file path

const envFile = path.join(__dirname, "../", '.env');

config({ path: envFile});

const _config = {
    port: process.env.HTTP_SERVER_PORT || 3000,
    socketPort: process.env.SERVER_SOCKET_PORT || 4000,
    host: process.env.HTTP_SERVER_HOST || 'localhost',
    db: {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASS || process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'test',
        port: process.env.DB_PORT || 3306
    },
    privateKEY: process.env.PRIVATE_KEY || randomBytes(32).toString('hex'),
    systemToken: process.env.ADMIN_TOKEN || randomBytes(48).toString('hex'),
    websocketToken: process.env.WEBSOCKET_TOKEN || randomBytes(32).toString('hex'),
    discord: {
        clientID: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        botToken: process.env.BOT_TOKEN
    }
};

export default _config;