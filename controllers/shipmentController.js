const Shipment = require('../models/Shipment');
const Flight = require('../models/Flight');
const CargoManifest = require('../models/CargoManifest');
const asyncHandler = require('express-async-handler');

// @desc    Create a new goods shipment
// @route   POST /api/shipments
// @access  Private/LogisticsCoordinator
const createShipment = asyncHandler(async (req, res) => {
  const {
    trackingNumber, sender, receiver, commodityType, quantity, 
    weight, volume, destination, assignedFlight
  } = req.body;

  if (!trackingNumber || !sender || !receiver || !commodityType || !quantity || !weight || !destination) {
    res.status(400);
    throw new Error('Please fill all required shipment fields');
  }

  const shipmentExists = await Shipment.findOne({ trackingNumber });
  if (shipmentExists) {
    res.status(400);
    throw new Error('Shipment with this tracking number already exists');
  }

  const shipment = await Shipment.create({
    trackingNumber, sender, receiver, commodityType, quantity, 
    weight, volume,
    destination,
    assignedFlight: assignedFlight || null,
    currentStatus: 'booked',
    trackingUpdates: [{ status: 'booked', location: 'Origin' }]
  });

  // If assigned to a flight during creation, update flight and manifest
  if (assignedFlight) {
    const flight = await Flight.findById(assignedFlight);
    if (flight) {
      if ((flight.currentCargoWeight + shipment.weight) > flight.cargoCapacity) {
        // Handle this error or prevent assignment if capacity exceeded
        console.warn(`Shipment ${shipment.trackingNumber} exceeds flight ${flight.flightNumber} cargo capacity. Shipment created but not assigned to flight.`);
        shipment.assignedFlight = null;
        await shipment.save();
      } else {
        flight.scheduledShipments.push(shipment._id);
        flight.currentCargoWeight += shipment.weight;
        await flight.save();

        // Update manifest
        let manifest = await CargoManifest.findOne({ flight: assignedFlight });
        if (!manifest) {
          manifest = new CargoManifest({ flight: assignedFlight, shipments: [] });
        }
        manifest.shipments.addToSet(shipment._id);
        manifest.totalWeight = (manifest.totalWeight || 0) + shipment.weight;
        manifest.totalVolume = (manifest.totalVolume || 0) + (shipment.volume || 0);
        await manifest.save();
      }
    }
  }

  res.status(201).json(shipment);
});

// @desc    Get all shipments
// @route   GET /api/shipments
// @access  Private
const getShipments = asyncHandler(async (req, res) => {
  const shipments = await Shipment.find({})
    .populate('assignedFlight', 'flightNumber origin destination');
  res.status(200).json(shipments);
});

// @desc    Get shipment by ID
// @route   GET /api/shipments/:id
// @access  Private
const getShipmentById = asyncHandler(async (req, res) => {
  const shipment = await Shipment.findById(req.params.id)
    .populate('assignedFlight', 'flightNumber origin destination');

  if (!shipment) {
    res.status(404);
    throw new Error('Shipment not found');
  }

  res.status(200).json(shipment);
});

// @desc    Update a goods shipment
// @route   PUT /api/shipments/:id
// @access  Private/LogisticsCoordinator
const updateShipment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { assignedFlight: newAssignedFlightId, weight: newWeight, volume: newVolume, ...otherUpdates } = req.body;

  const shipment = await Shipment.findById(id);
  if (!shipment) {
    res.status(404);
    throw new Error('Shipment not found');
  }

  // Handle re-assignment of flight
  if (newAssignedFlightId && String(shipment.assignedFlight) !== String(newAssignedFlightId)) {
    // Remove from old flight if assigned
    if (shipment.assignedFlight) {
      const oldFlight = await Flight.findById(shipment.assignedFlight);
      if (oldFlight) {
        oldFlight.scheduledShipments = oldFlight.scheduledShipments.filter(sId => String(sId) !== String(id));
        oldFlight.currentCargoWeight -= shipment.weight;
        // oldFlight.currentCargoVolume -= shipment.volume; // Uncomment if volume is used
        await oldFlight.save();

        // Update old manifest
        const oldManifest = await CargoManifest.findOne({ flight: oldFlight._id });
        if (oldManifest) {
          oldManifest.shipments = oldManifest.shipments.filter(sId => String(sId) !== String(id));
          oldManifest.totalWeight -= shipment.weight;
          oldManifest.totalVolume -= (shipment.volume || 0);
          await oldManifest.save();
        }
      }
    }

    // Assign to new flight
    const newFlight = await Flight.findById(newAssignedFlightId);
    if (!newFlight) {
      res.status(404);
      throw new Error('New assigned flight not found');
    }
    
    const effectiveWeight = newWeight !== undefined ? newWeight : shipment.weight;
    const effectiveVolume = newVolume !== undefined ? newVolume : shipment.volume;

    if ((newFlight.currentCargoWeight + effectiveWeight) > newFlight.cargoCapacity) {
      res.status(400);
      throw new Error('Not enough cargo space on new flight (weight limit exceeded).');
    }
    // If volume is used, add similar check

    newFlight.scheduledShipments.push(id);
    newFlight.currentCargoWeight += effectiveWeight;
    // newFlight.currentCargoVolume += effectiveVolume; // Uncomment if volume is used
    await newFlight.save();

    // Update new manifest
    let newManifest = await CargoManifest.findOne({ flight: newAssignedFlightId });
    if (!newManifest) {
      newManifest = new CargoManifest({ flight: newAssignedFlightId, shipments: [] });
    }
    newManifest.shipments.addToSet(id);
    newManifest.totalWeight = (newManifest.totalWeight || 0) + effectiveWeight;
    newManifest.totalVolume = (newManifest.totalVolume || 0) + (effectiveVolume || 0);
    await newManifest.save();

    shipment.assignedFlight = newAssignedFlightId;
  }

  // Update other fields
  Object.assign(shipment, otherUpdates);
  if (newWeight !== undefined) shipment.weight = newWeight;
  if (newVolume !== undefined) shipment.volume = newVolume;

  await shipment.save();

  // Placeholder: Reflect real-time goods tracking updates within 30 seconds of an event occurring.
  // This would typically involve websockets or a message queue for real-time updates to clients.
  console.log(`Shipment ${shipment.trackingNumber} updated. Real-time update mechanisms should be engaged.`);

  res.status(200).json(shipment);
});

// @desc    Delete a goods shipment
// @route   DELETE /api/shipments/:id
// @access  Private/LogisticsCoordinator
const deleteShipment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const shipment = await Shipment.findById(id);

  if (!shipment) {
    res.status(404);
    throw new Error('Shipment not found');
  }

  // Remove from assigned flight and manifest if applicable
  if (shipment.assignedFlight) {
    const flight = await Flight.findById(shipment.assignedFlight);
    if (flight) {
      flight.scheduledShipments = flight.scheduledShipments.filter(sId => String(sId) !== String(id));
      flight.currentCargoWeight -= shipment.weight;
      // flight.currentCargoVolume -= shipment.volume; // Uncomment if volume is used
      await flight.save();
    }

    const manifest = await CargoManifest.findOne({ flight: shipment.assignedFlight });
    if (manifest) {
      manifest.shipments = manifest.shipments.filter(sId => String(sId) !== String(id));
      manifest.totalWeight -= shipment.weight;
      manifest.totalVolume -= (shipment.volume || 0);
      await manifest.save();
    }
  }

  await shipment.deleteOne();

  res.status(200).json({ message: 'Shipment removed' });
});

// @desc    Update shipment status and add a tracking update
// @route   PUT /api/shipments/:id/status
// @access  Private/LogisticsCoordinator/GroundStaff
const updateShipmentStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, location } = req.body;

  if (!status) {
    res.status(400);
    throw new Error('Status field is required');
  }

  const shipment = await Shipment.findById(id);

  if (!shipment) {
    res.status(404);
    throw new Error('Shipment not found');
  }

  shipment.currentStatus = status;
  shipment.trackingUpdates.push({ status, location });
  await shipment.save();

  // Placeholder for Handheld Device Integration (if 'location' implies a scan point)
  console.log(`Shipment ${shipment.trackingNumber} status updated to ${status} at ${location || 'unknown'}.`);
  
  // Placeholder for GPS Tracking Integration for real-time location data
  // If 'location' comes from a GPS device, this would be a separate service updating this.

  res.status(200).json(shipment);
});

module.exports = {
  createShipment,
  getShipments,
  getShipmentById,
  updateShipment,
  deleteShipment,
  updateShipmentStatus
};