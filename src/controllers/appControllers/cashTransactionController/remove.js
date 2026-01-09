const mongoose = require('mongoose');
const { calculate } = require('@/helpers');

const Model = mongoose.model('CashTransaction');
const InvoiceModel = mongoose.model('Invoice');

const remove = async (req, res) => {
  try {
    const { id } = req.params;

    // Get the transaction before deleting
    const transaction = await Model.findById(id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        result: null,
        message: 'Cash transaction not found',
      });
    }

    // If transaction is linked to an invoice and type is 'in', reverse the credit
    if (transaction.invoice && transaction.type === 'in') {
      const invoice = await InvoiceModel.findById(transaction.invoice);
      if (invoice) {
        // Subtract the transaction amount from credit
        const newCredit = Math.max(0, calculate.sub(invoice.credit || 0, transaction.amount));
        const total = invoice.total || 0;

        let paymentStatus = 'unpaid';
        if (newCredit >= total) {
          paymentStatus = 'paid';
        } else if (newCredit > 0) {
          paymentStatus = 'partially';
        }

        await InvoiceModel.findByIdAndUpdate(
          transaction.invoice,
          {
            credit: newCredit,
            paymentStatus: paymentStatus,
          },
          { new: true }
        );
      }
    }

    // Soft delete - mark as removed
    const result = await Model.findByIdAndUpdate(
      id,
      { removed: true },
      {
        new: true,
      }
    ).exec();

    return res.status(200).json({
      success: true,
      result,
      message: 'Cash transaction deleted successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: error.message,
    });
  }
};

module.exports = remove;
