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

    // If this transaction is type 'in' (cash received) and has a client
    if (body.type === 'in' && body.client) {
      // If a specific invoice is selected, apply payment to that invoice
      if (body.invoice) {
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
      } else {
        // No specific invoice selected - auto-allocate to oldest unpaid invoices
        let remainingAmount = body.amount;
        const appliedToInvoices = [];

        // Find all unpaid/partially paid invoices for this client, sorted by date (oldest first)
        const unpaidInvoices = await InvoiceModel.find({
          client: body.client,
          paymentStatus: { $in: ['unpaid', 'partially'] },
          removed: false,
        }).sort({ date: 1 }); // Sort by date ascending (oldest first)

        // Apply payment to invoices starting from oldest
        for (const invoice of unpaidInvoices) {
          if (remainingAmount <= 0) break;

          const currentCredit = invoice.credit || 0;
          const total = invoice.total || 0;
          const pendingAmount = calculate.sub(total, currentCredit);

          // Calculate how much to apply to this invoice
          const amountToApply = Math.min(remainingAmount, pendingAmount);
          const newCredit = calculate.add(currentCredit, amountToApply);

          // Determine new payment status
          let paymentStatus = 'unpaid';
          if (newCredit >= total) {
            paymentStatus = 'paid';
          } else if (newCredit > 0) {
            paymentStatus = 'partially';
          }

          // Update the invoice
          await InvoiceModel.findByIdAndUpdate(
            invoice._id,
            {
              credit: newCredit,
              paymentStatus: paymentStatus,
            },
            { new: true }
          );

          // Track which invoice received payment and how much
          appliedToInvoices.push({
            invoice: invoice._id,
            amount: amountToApply,
          });

          // Reduce remaining amount
          remainingAmount = calculate.sub(remainingAmount, amountToApply);
        }

        // Update the transaction with applied invoices tracking
        if (appliedToInvoices.length > 0) {
          await Model.findByIdAndUpdate(result._id, {
            appliedToInvoices: appliedToInvoices,
          });
        }
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
