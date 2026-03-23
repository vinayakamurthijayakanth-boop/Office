const mongoose = require('mongoose');

const CargoManifestSchema = new mongoose.Schema({
  flight: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Flight',
    required: true,
    unique: true // A flight should only have one manifest
  },
  shipments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shipment'
  }],
  totalWeight: {
    type: Number,
    default: 0
  },
  totalVolume: {
    type: Number,
    default: 0
  },
  generatedAt: {
    type: Date,
    default: Date.now
  },
  lastUpdatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update lastUpdatedAt on every save
CargoManifestSchema.pre('save', function(next) {
  this.lastUpdatedAt = Date.now();
  next();
});

module.exports = mongoose.model('CargoManifest', CargoManifestSchema);