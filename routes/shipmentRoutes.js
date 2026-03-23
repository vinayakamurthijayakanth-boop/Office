const express = require('express');
const { 
  createShipment, 
  getShipments, 
  getShipmentById, 
  updateShipment, 
  deleteShipment, 
  updateShipmentStatus 
} = require('../controllers/shipmentController');
const { protect, authorize } = require('../middleware/authMiddleware');
const router = express.Router();

// Protect all routes with authentication
router.use(protect);

router.route('/')
  .post(authorize(['admin', 'logistics_coordinator']), createShipment)
  .get(getShipments);

router.route('/:id')
  .get(getShipmentById)
  .put(authorize(['admin', 'logistics_coordinator']), updateShipment)
  .delete(authorize(['admin', 'logistics_coordinator']), deleteShipment);

router.put('/:id/status', authorize(['admin', 'logistics_coordinator', 'ground_staff']), updateShipmentStatus);

module.exports = router;