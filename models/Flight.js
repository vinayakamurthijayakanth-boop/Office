const mongoose = require('mongoose');

const FlightSchema = new mongoose.Schema({
  flightNumber: {
    type: String,
    required: true,
    unique: true
  },
  origin: {
    type: String,
    required: true
  },
  destination: {
    type: String,
    required: true
  },
  departureTime: {
    type: Date,
    required: true
  },
  arrivalTime: {
    type: Date,
    required: true
  },
  aircraftType: {
    type: String,
    required: true
  },
  assignedCrew: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' // Assuming crew are users in the system
  }],
  status: {
    type: String,
    enum: ['scheduled', 'departed', 'in_air', 'landed', 'delayed', 'cancelled'],
    default: 'scheduled'
  },
  cargoCapacity: {
    type: Number, // Max weight or volume
    required: true
  },
  currentCargoWeight: {
    type: Number,
    default: 0
  },
  currentCargoVolume: {
    type: Number,
    default: 0
  },
  scheduledShipments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shipment'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Flight', FlightSchema);