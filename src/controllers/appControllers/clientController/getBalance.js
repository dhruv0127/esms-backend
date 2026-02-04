const mongoose = require('mongoose');

const Invoice = mongoose.model('Invoice');
const Payment = mongoose.model('Payment');

const getBalance = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Client ID is required',
      });
    }

    // Get all invoices for this client
    const invoices = await Invoice.find({
      client: id,
      removed: false,
    }).lean();

    // Calculate total outstanding
    let totalInvoiced = 0;
    let totalPaid = 0;

    invoices.forEach((invoice) => {
      totalInvoiced += invoice.total || 0;
      totalPaid += invoice.credit || 0;
    });

    const outstanding = totalInvoiced - totalPaid;

    return res.status(200).json({
      success: true,
      result: {
        totalInvoiced,
        totalPaid,
        outstanding,
      },
      message: 'Successfully fetched client balance',
    });
  } catch (error) {
    console.error('Error fetching client balance:', error);
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error fetching client balance: ' + error.message,
    });
  }
};

module.exports = getBalance;
