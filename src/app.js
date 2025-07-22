import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
// import { json } from 'body-parser';
import incidentRoutes from './routes/incident.routes.js';
import userRoutes from './routes/user.routes.js';
import dotenv from "dotenv";
import bodyParser from "body-parser"; // Use default import

const { json } = bodyParser; // Destructure the json method

dotenv.config();

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(json());

// Routes
app.use('/api/incidents', incidentRoutes);
app.use('/api/users', userRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

export default app;
