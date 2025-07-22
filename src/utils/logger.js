import fs from 'fs';
import path from 'path';

const logFilePath = path.join(__dirname, '../logs/app.log');

const logMessage = (message) => {
  const timestamp = new Date().toISOString();
  const logEntry = `${timestamp} - ${message}\n`;
  console.log(logEntry);
  fs.appendFileSync(logFilePath, logEntry);
};

const logError = (error) => {
  const timestamp = new Date().toISOString();
  const logEntry = `${timestamp} - ERROR: ${error}\n`;
  console.error(logEntry);
  fs.appendFileSync(logFilePath, logEntry);
};

export { logMessage, logError };