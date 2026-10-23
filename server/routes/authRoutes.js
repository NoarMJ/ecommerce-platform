
const express = require('express');
const { register , login , getMe , logout } = require('../controllers/authController');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

// POST /api/auth/register
router.post('/register', register);
router.post('/login' , login);
router.get('/me' , requireAuth, getMe);
router.post('/logout' , logout);


module.exports = router;
