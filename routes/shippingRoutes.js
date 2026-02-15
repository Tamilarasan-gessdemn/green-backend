// routes/shippingRoutes.js
import express from 'express';
import { calculateShipping, checkServiceability,calculateShippingCharges } from '../controllers/shippingController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Calculate shipping cost
router.post('/calculate', protect, calculateShipping);

// Check PIN code serviceability
// router.post('/check-serviceability', protect, checkServiceability);

router.post('/check-serviceability',protect,checkServiceability)
router.post("/calculate-charges", calculateShippingCharges);

export default router;