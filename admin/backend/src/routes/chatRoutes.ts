import express from 'express';
const router = express.Router();

// Basic placeholder route
router.get('/', (req, res) => {
    res.json({ message: 'Chat routes working' });
});

export default router; 