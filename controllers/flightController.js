const Flight = require('../models/Flight');
const Shipment = require('../models/Shipment');
const CargoManifest = require('../models/CargoManifest');
const asyncHandler = require('express-async-handler');

// @desc    Create a new flight schedule
// @route   POST /api/flights
// @access  Private/FlightManager
const createFlight = asyncHandler(async (req, res) => {
  const {
    flightNumber, origin, destination, departureTime, arrivalTime, 
    aircraftType, assignedCrew, cargoCapacity
  } = req.body;

  if (!flightNumber || !origin || !destination || !departureTime || !arrivalTime || !aircraftType || !cargoCapacity) {
    res.status(400);
    throw new Error('Please fill all required flight fields');
  }

  const flight = await Flight.create({
    flightNumber, origin, destination, departureTime, arrivalTime, 
    aircraftType, assignedCrew, cargoCapacity
  });

  res.status(201).json(flight);
});

// @desc    Get all flights
// @route   GET /api/flights
// @access  Private
const getFlights = asyncHandler(async (req, res) => {
  const flights = await Flight.find({})
    .populate('assignedCrew', 'username')
    .populate('scheduledShipments', 'trackingNumber currentStatus');
  res.status(200).json(flights);
});

// @desc    Get flight by ID
// @route   GET /api/flights/:id
// @access  Private
const getFlightById = asyncHandler(async (req, res) => {
  const flight = await Flight.findById(req.params.id)
    .populate('assignedCrew', 'username')
    .populate('scheduledShipments', 'trackingNumber currentStatus');

  if (!flight) {
    res.status(404);
    throw new Error('Flight not found');
  }

  res.status(200).json(flight);
});

// @desc    Update a flight schedule
// @route   PUT /api/flights/:id
// @access  Private/FlightManager
const updateFlight = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updatedFlight = await Flight.findByIdAndUpdate(id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!updatedFlight) {
    res.status(404);
    throw new Error('Flight not found');
  }

  // Placeholder: Propagate changes to related logistics info (e.g., re-evaluate shipments)
  console.log(`Flight ${updatedFlight.flightNumber} updated. Propagating changes...`);

  res.status(200).json(updatedFlight);
});

// @desc    Delete a flight schedule
// @route   DELETE /api/flights/:id
// @access  Private/FlightManager
const deleteFlight = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const flight = await Flight.findById(id);

  if (!flight) {
    res.status(404);
    throw new Error('Flight not found');
  }

  await flight.deleteOne();

  // Placeholder: Handle associated shipments (e.g., unassign, re-assign)
  await Shipment.updateMany({ assignedFlight: id }, { assignedFlight: null, currentStatus: 'booked' });

  // Remove associated manifest
  await CargoManifest.deleteOne({ flight: id });

  res.status(200).json({ message: 'Flight removed and associated shipments unassigned' });
});

// @desc    Update flight status (e.g., delayed, cancelled)
// @route   PUT /api/flights/:id/status
// @access  Private/FlightManager
const updateFlightStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    res.status(400);
    throw new Error('Status field is required');
  }

  const flight = await Flight.findById(id);

  if (!flight) {
    res.status(404);
    throw new Error('Flight not found');
  }

  flight.status = status;
  await flight.save();

  // Placeholder: Notify relevant Logistics Coordinator
  // This would involve a notification service (e.g., email, WebSocket)
  console.log(`Flight ${flight.flightNumber} status updated to ${status}. Notifying Logistics Coordinators...`);

  // Placeholder: Facilitate revision of goods pickup/delivery schedules
  // This would involve more complex logic, potentially sending events to a logistics service
  
  res.status(200).json(flight);
});

// @desc    Add a new goods shipment to an existing flight
// @route   POST /api/flights/:id/shipments
// @access  Private/LogisticsCoordinator
const addShipmentToFlight = asyncHandler(async (req, res) => {
  const { id: flightId } = req.params;
  const { shipmentId } = req.body;

  if (!shipmentId) {
    res.status(400);
    throw new Error('Shipment ID is required');
  }

  const flight = await Flight.findById(flightId);
  if (!flight) {
    res.status(4404);
    throw new Error('Flight not found');
  }

  const shipment = await Shipment.findById(shipmentId);
  if (!shipment) {
    res.status(404);
    throw new Error('Shipment not found');
  }

  if (flight.scheduledShipments.includes(shipmentId)) {
    res.status(400);
    throw new Error('Shipment already assigned to this flight');
  }

  // Verify available cargo space
  // Assuming weight and volume are stored in shipment and flight models
  if ((flight.currentCargoWeight + shipment.weight) > flight.cargoCapacity) {
    res.status(400);
    throw new Error('Not enough cargo space on flight for this shipment (weight limit exceeded).');
  }
  // You might also need to check volume if 'volume' is defined for shipment/flight
  // if ((flight.currentCargoVolume + shipment.volume) > flight.cargoVolumeCapacity) {
  //   res.status(400);
  //   throw new Error('Not enough cargo space on flight for this shipment (volume limit exceeded).');
  // }

  flight.scheduledShipments.push(shipmentId);
  flight.currentCargoWeight += shipment.weight;
  // flight.currentCargoVolume += shipment.volume; // Uncomment if volume is used
  await flight.save();

  shipment.assignedFlight = flightId;
  shipment.currentStatus = 'booked'; // Or 'assigned_to_flight'
  shipment.trackingUpdates.push({ status: 'booked', location: `Assigned to flight ${flight.flightNumber}` });
  await shipment.save();

  // Automatically update/create flight manifest
  let manifest = await CargoManifest.findOne({ flight: flightId });
  if (!manifest) {
    manifest = new CargoManifest({ flight: flightId, shipments: [] });
  }
  manifest.shipments.addToSet(shipmentId); // Add shipment if not already present
  manifest.totalWeight = (manifest.totalWeight || 0) + shipment.weight;
  manifest.totalVolume = (manifest.totalVolume || 0) + (shipment.volume || 0);
  await manifest.save();

  // Placeholder: Calculate associated costs (integration with ERP system)
  // This would involve calling an external service or more complex logic.
  console.log(`Shipment ${shipment.trackingNumber} added to Flight ${flight.flightNumber}. Costs calculation triggered.`);

  res.status(200).json({
    message: 'Shipment added to flight and manifest updated',
    flight,
    shipment,
    manifest
  });
});

// @desc    Generate cargo manifest for a flight
// @route   GET /api/flights/:id/manifest
// @access  Private/AllAuthorizedRoles
const generateCargoManifest = asyncHandler(async (req, res) => {
  const { id: flightId } = req.params;

  const manifest = await CargoManifest.findOne({ flight: flightId }).populate('shipments');

  if (!manifest) {
    res.status(404);
    throw new Error('Cargo manifest not found for this flight. Please ensure shipments are assigned.');
  }

  res.status(200).json(manifest);
});

// Placeholder for Weather Data Integration
const getWeatherForecast = asyncHandler(async (flightId) => {
  // In a real application, this would call an external weather API
  console.log(`Fetching weather data for flight ${flightId}...`);
  return { temperature: '25C', conditions: 'Clear', wind: '10mph' }; // Mock data
});

module.exports = {
  createFlight,
  getFlights,
  getFlightById,
  updateFlight,
  deleteFlight,
  updateFlightStatus,
  addShipmentToFlight,
  generateCargoManifest,
};
