const mongoose = require('mongoose');

const returnExchangeSchema = new mongoose.Schema({
  removed: {
    type: Boolean,
    default: false,
  },
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'Admin',
    required: true
  },
  number: {
    type: Number,
    required: true,
  },
  year: {
    type: Number,
    required: true,
  },
  type: {
    type: String,
    enum: ['return', 'exchange'],
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  customer: {
    type: mongoose.Schema.ObjectId,
    ref: 'Client',
    required: true,
    autopopulate: true,
  },
  // Original item being returned
  returnedItem: {
    inventory: {
      type: mongoose.Schema.ObjectId,
      ref: 'Inventory',
      autopopulate: true,
    },
    itemName: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    total: {
      type: Number,
      required: true,
    },
  },
  // New item for exchange (only if type is 'exchange')
  exchangedItem: {
    inventory: {
      type: mongoose.Schema.ObjectId,
      ref: 'Inventory',
      autopopulate: true,
    },
    itemName: {
      type: String,
    },
    quantity: {
      type: Number,
    },
    price: {
      type: Number,
    },
    total: {
      type: Number,
    },
  },
  // If there's a price difference in exchange
  priceDifference: {
    type: Number,
    default: 0,
  },
  currency: {
    type: String,
    default: 'NA',
    uppercase: true,
    required: true,
  },
  reason: {
    type: String,
  },
  notes: {
    type: String,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'completed'],
    default: 'pending',
  },
  updated: {
    type: Date,
    default: Date.now,
  },
  created: {
    type: Date,
    default: Date.now,
  },
});

returnExchangeSchema.plugin(require('mongoose-autopopulate'));
module.exports = mongoose.model('ReturnExchange', returnExchangeSchema);
