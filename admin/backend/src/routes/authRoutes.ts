import express from 'express';
import { Request, Response } from 'express';
import { login, register } from '../controllers/authController';

const router = express.Router();

router.post('/register', async (req: Request, res: Response) => {
    try {
        await register(req, res);
    } catch (error) {
        res.status(500).send('Internal Server Error');
    }
});

router.post('/login', async (req: Request, res: Response) => {
    try {
        await login(req, res);
    } catch (error) {
        res.status(500).send('Internal Server Error');
    }
});

export default router; 