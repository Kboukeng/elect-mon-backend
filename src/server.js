import express from 'express';
import dotenv from 'dotenv';
import app from './app.js';

dotenv.config();

const PORT = process.env.PORT || 3000;

const server = express();

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});