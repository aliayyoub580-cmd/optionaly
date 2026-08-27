const path = require('path');
const fs = require('fs');

const initialPort = process.env.PORT;

const rootPath = path.join(__dirname, '..', '..', '..', '.env');
const backendPath = path.join(__dirname, '..', '..', '.env');

if (fs.existsSync(rootPath)) {
  require('dotenv').config({ path: rootPath });
} else if (fs.existsSync(backendPath)) {
  require('dotenv').config({ path: backendPath });
}

module.exports = {
  port: initialPort || process.env.PORT || 4000,
  nodeEnv: process.env.NODE_ENV || 'production',
  jwtSecret: process.env.JWT_SECRET || 'qx-trade-secret',
  frontendUrl: process.env.FRONTEND_URL || 'https://optionaly.com',
};
