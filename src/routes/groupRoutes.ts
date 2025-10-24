import { Router } from 'express';
// Will import controllers when created
// import { createGroup, getGroups, getGroupById, updateGroup, deleteGroup } from '../controllers/groupController';

const router = Router();

// Group routes
router.post('/', (req, res) => {
  res.status(200).json({ message: 'Create group endpoint' });
});

router.get('/', (req, res) => {
  res.status(200).json({ message: 'Get all groups endpoint' });
});

router.get('/:id', (req, res) => {
  res.status(200).json({ message: `Get group with ID: ${req.params.id}` });
});

router.put('/:id', (req, res) => {
  res.status(200).json({ message: `Update group with ID: ${req.params.id}` });
});

router.delete('/:id', (req, res) => {
  res.status(200).json({ message: `Delete group with ID: ${req.params.id}` });
});

export default router;