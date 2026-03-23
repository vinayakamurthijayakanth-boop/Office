const mongoose = require('mongoose');

const TrackingUpdateSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['booked', 'departed', 'in_transit', 'arrived_destination', 'delivered', 'delayed', 'cancelled'],
    required: true
  },
  location: {
    type: String
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { _id: false }); // No _id for subdocuments if not needed explicitly

const ShipmentSchema = new mongoose.Schema({
  trackingNumber: {
    type: String,
    required: true,
    unique: true
  },
  sender: {
    name: String,
    address: String,
    contact: String
  },
  receiver: {
    name: String,
    address: String,
    contact: String
  },
  commodityType: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  weight: {
    type: Number,
    required: true
  },
  volume: {
    type: Number // Added for cargo space verification
  },
  destination: {
    type: String,
    required: true
  },
  currentStatus: {
    type: String,
    enum: ['booked', 'departed', 'in_transit', 'arrived_destination', 'delivered', 'delayed', 'cancelled'],
    default: 'booked'
  },
  trackingUpdates: [TrackingUpdateSchema],
  assignedFlight: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Flight'
  },
  estimatedCost: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Shipment', ShipmentSchema);