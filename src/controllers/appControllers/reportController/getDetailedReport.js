const mongoose = require('mongoose');

const Invoice = mongoose.model('Invoice');
const Purchase = mongoose.model('Purchase');
const CashTransaction = mongoose.model('CashTransaction');
const ReturnExchange = mongoose.model('ReturnExchange');

const getDetailedReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Validate dates
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Both startDate and endDate are required',
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // Include the entire end date

    // Validate date range
    if (start > end) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'startDate cannot be after endDate',
      });
    }

    // Fetch invoices
    const invoices = await Invoice.find({
      removed: false,
      date: { $gte: start, $lte: end },
    })
      .populate('client', 'name')
      .sort({ date: -1 })
      .lean();

    // Fetch purchases
    const purchases = await Purchase.find({
      removed: false,
      date: { $gte: start, $lte: end },
    })
      .populate('supplier', 'name')
      .sort({ date: -1 })
      .lean();

    // Fetch cash transactions
    const cashTransactions = await CashTransaction.find({
      removed: false,
      date: { $gte: start, $lte: end },
    })
      .populate('client', 'name')
      .populate('supplier', 'name')
      .sort({ date: -1 })
      .lean();

    // Fetch return/exchanges
    const returnExchanges = await ReturnExchange.find({
      removed: false,
      date: { $gte: start, $lte: end },
    })
      .populate('customer', 'name')
      .sort({ date: -1 })
      .lean();

    // Calculate summary statistics
    const summary = {
      invoices: {
        count: invoices.length,
        totalAmount: invoices.reduce((sum, inv) => sum + (inv.total || 0), 0),
        paidAmount: invoices.reduce((sum, inv) => sum + (inv.credit || 0), 0),
        unpaidAmount: invoices.reduce((sum, inv) => sum + ((inv.total || 0) - (inv.credit || 0)), 0),
      },
      purchases: {
        count: purchases.length,
        totalAmount: purchases.reduce((sum, pur) => sum + (pur.total || 0), 0),
        paidAmount: purchases.reduce((sum, pur) => sum + (pur.credit || 0), 0),
        unpaidAmount: purchases.reduce((sum, pur) => sum + ((pur.total || 0) - (pur.credit || 0)), 0),
      },
      cashTransactions: {
        count: cashTransactions.length,
        cashIn: cashTransactions
          .filter((ct) => ct.type === 'in')
          .reduce((sum, ct) => sum + (ct.amount || 0), 0),
        cashOut: cashTransactions
          .filter((ct) => ct.type === 'out')
          .reduce((sum, ct) => sum + (ct.amount || 0), 0),
        netCash: 0, // Will be calculated below
      },
      returnExchanges: {
        count: returnExchanges.length,
        returns: returnExchanges.filter((re) => re.type === 'return').length,
        exchanges: returnExchanges.filter((re) => re.type === 'exchange').length,
        totalReturns: returnExchanges
          .filter((re) => re.type === 'return')
          .reduce((sum, re) => sum + (re.returnedItem?.total || 0), 0),
        totalExchangeDifference: returnExchanges
          .filter((re) => re.type === 'exchange')
          .reduce((sum, re) => sum + (re.priceDifference || 0), 0),
      },
    };

    summary.cashTransactions.netCash =
      summary.cashTransactions.cashIn - summary.cashTransactions.cashOut;

    // Return comprehensive report data
    return res.status(200).json({
      success: true,
      result: {
        dateRange: {
          startDate: start,
          endDate: end,
        },
        summary,
        details: {
          invoices,
          purchases,
          cashTransactions,
          returnExchanges,
        },
      },
      message: 'Successfully fetched detailed report',
    });
  } catch (error) {
    console.error('Error fetching detailed report:', error);
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error fetching detailed report: ' + error.message,
    });
  }
};

module.exports = getDetailedReport;
