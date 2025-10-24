import { Router } from 'express';
// Will import controllers when create
// import { registerUser, loginUser, getUser, updateUser } from '../controllers/userController';

const router = Router();

// User routes
router.post('/register', (req, res) => {
  res.status(200).json({ message: 'User registration endpoint' });
});

router.post('/login', (req, res) => {
  res.status(200).json({ message: 'User login endpoint' });
});

router.get('/profile', (req, res) => {
  res.status(200).json({ message: 'User profile endpoint' });
});

router.put('/profile', (req, res) => {
  res.status(200).json({ message: 'Update user profile endpoint' });
});

export default router;