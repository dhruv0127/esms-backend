const mongoose = require('mongoose');
const { calculate } = require('@/helpers');

const Model = mongoose.model('CashTransaction');
const InvoiceModel = mongoose.model('Invoice');

const create = async (req, res) => {
  try {
    let body = req.body;

    // Set createdBy from authenticated admin
    body['createdBy'] = req.admin._id;
    body['removed'] = false;

    // Creating a new document in the collection
    const result = await new Model(body).save();

    // If this transaction is linked to an invoice and type is 'in' (cash received)
    if (body.invoice && body.type === 'in') {
      const invoice = await InvoiceModel.findById(body.invoice);

      if (invoice) {
        // Add the transaction amount to invoice credit
        const newCredit = calculate.add(invoice.credit || 0, body.amount);
        const total = invoice.total || 0;

        // Determine new payment status
        let paymentStatus = 'unpaid';
        if (newCredit >= total) {
          paymentStatus = 'paid';
        } else if (newCredit > 0) {
          paymentStatus = 'partially';
        }

        // Update the invoice
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

    // Returning successful response
    return res.status(200).json({
      success: true,
      result,
      message: 'Cash transaction created successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: error.message,
    });
  }
};

module.exports = create;
