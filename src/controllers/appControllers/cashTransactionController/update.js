const mongoose = require('mongoose');
const { calculate } = require('@/helpers');

const Model = mongoose.model('CashTransaction');
const InvoiceModel = mongoose.model('Invoice');

const update = async (req, res) => {
  try {
    const { id } = req.params;
    let body = req.body;

    // Get the old transaction to compare
    const oldTransaction = await Model.findById(id);

    if (!oldTransaction) {
      return res.status(404).json({
        success: false,
        result: null,
        message: 'Cash transaction not found',
      });
    }

    // Update the transaction
    const result = await Model.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    }).exec();

    // Handle invoice credit updates
    // If old transaction had an invoice link, reverse the credit
    if (oldTransaction.invoice && oldTransaction.type === 'in') {
      const oldInvoice = await InvoiceModel.findById(oldTransaction.invoice);
      if (oldInvoice) {
        // Subtract the old amount from credit
        const newCredit = Math.max(0, calculate.sub(oldInvoice.credit || 0, oldTransaction.amount));
        const total = oldInvoice.total || 0;

        let paymentStatus = 'unpaid';
        if (newCredit >= total) {
          paymentStatus = 'paid';
        } else if (newCredit > 0) {
          paymentStatus = 'partially';
        }

        await InvoiceModel.findByIdAndUpdate(
          oldTransaction.invoice,
          {
            credit: newCredit,
            paymentStatus: paymentStatus,
          },
          { new: true }
        );
      }
    }

    // If new transaction has an invoice link, add the credit
    if (body.invoice && body.type === 'in') {
      const invoice = await InvoiceModel.findById(body.invoice);
      if (invoice) {
        const newCredit = calculate.add(invoice.credit || 0, body.amount);
        const total = invoice.total || 0;

        let paymentStatus = 'unpaid';
        if (newCredit >= total) {
          paymentStatus = 'paid';
        } else if (newCredit > 0) {
          paymentStatus = 'partially';
        }

        await InvoiceModel.findByIdAndUpdate(
          body.invoice,
          {
            credit: newCredit,
            paymentStatus: paymentStatus,
          },
          { new: true }
        );
      }
    }

    return res.status(200).json({
      success: true,
      result,
      message: 'Cash transaction updated successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: error.message,
    });
  }
};

module.exports = update;
