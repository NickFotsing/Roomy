import { Router } from 'express';
// Will import controllers when created
// import { createBill, getBills, getBillById, updateBill, deleteBill } from '../controllers/billController';

const router = Router();

// Bill routes
router.post('/', (req, res) => {
  res.status(200).json({ message: 'Create bill endpoint' });
});

router.get('/', (req, res) => {
  res.status(200).json({ message: 'Get all bills endpoint' });
});

router.get('/:id', (req, res) => {
  res.status(200).json({ message: `Get bill with ID: ${req.params.id}` });
});

router.put('/:id', (req, res) => {
  res.status(200).json({ message: `Update bill with ID: ${req.params.id}` });
});

router.delete('/:id', (req, res) => {
  res.status(200).json({ message: `Delete bill with ID: ${req.params.id}` });
});

export default router;