const mongoose = require('mongoose');

const cashTransactionSchema = new mongoose.Schema({
  removed: {
    type: Boolean,
    default: false,
  },
  enabled: {
    type: Boolean,
    default: true,
  },

  // Transaction type: 'in' for money received, 'out' for money paid
  type: {
    type: String,
    enum: ['in', 'out'],
    required: true,
  },

  // Amount of transaction
  amount: {
    type: Number,
    required: true,
    min: 0,
  },

  // Currency
  currency: {
    type: String,
    default: 'INR',
    uppercase: true,
    required: true,
  },

  // Date of transaction
  date: {
    type: Date,
    default: Date.now,
    required: true,
  },

  // Party type: 'client' or 'supplier'
  partyType: {
    type: String,
    enum: ['client', 'supplier'],
    required: true,
  },

  // Reference to client (when partyType is 'client')
  client: {
    type: mongoose.Schema.ObjectId,
    ref: 'Client',
    autopopulate: true,
  },

  // Reference to supplier (when partyType is 'supplier')
  supplier: {
    type: mongoose.Schema.ObjectId,
    ref: 'Supplier',
  autopopulate: true,
  },

  // Reference to invoice (optional - for invoice payments)
  invoice: {
    type: mongoose.Schema.ObjectId,
    ref: 'Invoice',
    autopopulate: true,
  },

  // Track invoices that received auto-allocated payments (when no specific invoice selected)
  appliedToInvoices: [
    {
      invoice: {
        type: mongoose.Schema.ObjectId,
        ref: 'Invoice',
      },
      amount: {
        type: Number,
        required: true,
      },
    },
  ],

  // Reference number (check number, transaction ID, etc.)
  reference: {
    type: String,
  },

  // Description/Notes
  description: {
    type: String,
  },

  // Created by admin
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'Admin',
    autopopulate: true,
  },

  // Metadata
  created: {
    type: Date,
    default: Date.now,
  },
  updated: {
    type: Date,
    default: Date.now,
  },
});

cashTransactionSchema.plugin(require('mongoose-autopopulate'));

module.exports = mongoose.model('CashTransaction', cashTransactionSchema);
