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

    // Handle invoice credit updates - reverse old credits first
    if (oldTransaction.type === 'in') {
      // If old transaction had a specific invoice, reverse that credit
      if (oldTransaction.invoice) {
        const oldInvoice = await InvoiceModel.findById(oldTransaction.invoice);
        if (oldInvoice) {
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
      // If old transaction was auto-allocated, reverse those credits
      else if (oldTransaction.appliedToInvoices && oldTransaction.appliedToInvoices.length > 0) {
        for (const applied of oldTransaction.appliedToInvoices) {
          const invoice = await InvoiceModel.findById(applied.invoice);
          if (invoice) {
            const newCredit = Math.max(0, calculate.sub(invoice.credit || 0, applied.amount));
            const total = invoice.total || 0;

            let paymentStatus = 'unpaid';
            if (newCredit >= total) {
              paymentStatus = 'paid';
            } else if (newCredit > 0) {
              paymentStatus = 'partially';
            }

            await InvoiceModel.findByIdAndUpdate(
              applied.invoice,
              {
                credit: newCredit,
                paymentStatus: paymentStatus,
              },
              { new: true }
            );
          }
        }
      }
    }

    // Now apply new credits
    if (body.type === 'in' && body.client) {
      // If new transaction has a specific invoice, apply credit to it
      if (body.invoice) {
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

          // Clear appliedToInvoices since we have a specific invoice now
          await Model.findByIdAndUpdate(id, { appliedToInvoices: [] });
        }
      }
      // If no specific invoice, auto-allocate to oldest unpaid invoices
      else {
        let remainingAmount = body.amount;
        const appliedToInvoices = [];

        // Find all unpaid/partially paid invoices for this client, sorted by date (oldest first)
        const unpaidInvoices = await InvoiceModel.find({
          client: body.client,
          paymentStatus: { $in: ['unpaid', 'partially'] },
          removed: false,
        }).sort({ date: 1 });

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
          await Model.findByIdAndUpdate(id, {
            appliedToInvoices: appliedToInvoices,
          });
        }
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
