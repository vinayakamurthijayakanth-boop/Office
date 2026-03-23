const express = require('express');
const { 
  createFlight, 
  getFlights, 
  getFlightById, 
  updateFlight, 
  deleteFlight, 
  addShipmentToFlight, 
  updateFlightStatus, 
  generateCargoManifest 
} = require('../controllers/flightController');
const { protect, authorize } = require('../middleware/authMiddleware');
const router = express.Router();

// Protect all routes with authentication
router.use(protect);

router.route('/')
  .post(authorize(['admin', 'flight_manager']), createFlight)
  .get(getFlights);

router.route('/:id')
  .get(getFlightById)
  .put(authorize(['admin', 'flight_manager']), updateFlight)
  .delete(authorize(['admin', 'flight_manager']), deleteFlight);

router.put('/:id/status', authorize(['admin', 'flight_manager']), updateFlightStatus);
router.post('/:id/shipments', authorize(['admin', 'logistics_coordinator']), addShipmentToFlight); // Add shipment to an existing flight
router.get('/:id/manifest', authorize(['admin', 'flight_manager', 'logistics_coordinator', 'ground_staff']), generateCargoManifest);

module.exports = router;