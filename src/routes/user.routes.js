import express from 'express';
import { registerUser, loginUser, listUsers } from '../controllers/user.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/users', authenticate, listUsers);

export default router;