const mongoose = require('mongoose');

const Invoice = mongoose.model('Invoice');
const Payment = mongoose.model('Payment');
const ReturnExchange = mongoose.model('ReturnExchange');
const CashTransaction = mongoose.model('CashTransaction');

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

    // Get all return/exchanges for this client
    const returnExchanges = await ReturnExchange.find({
      customer: id,
      removed: false,
    }).lean();

    // Get all cash transactions for this client
    const cashTransactions = await CashTransaction.find({
      client: id,
      partyType: 'client',
      removed: false,
    }).lean();

    // Calculate total outstanding
    let totalInvoiced = 0;
    let totalPaid = 0;
    let totalReturns = 0;
    let totalExchangeDifference = 0;
    let totalCashIn = 0;
    let totalCashOut = 0;

    invoices.forEach((invoice) => {
      totalInvoiced += invoice.total || 0;
      totalPaid += invoice.credit || 0;
    });

    // Process returns and exchanges
    returnExchanges.forEach((returnExchange) => {
      if (returnExchange.type === 'return') {
        // Returns reduce what customer owes
        totalReturns += returnExchange.returnedItem?.total || 0;
      } else if (returnExchange.type === 'exchange') {
        // Exchange difference affects balance
        // Positive difference means customer owes more
        // Negative difference means customer gets credit
        totalExchangeDifference += returnExchange.priceDifference || 0;
      }
    });

    // Process cash transactions
    cashTransactions.forEach((cash) => {
      if (cash.type === 'in') {
        // Cash In means customer paid us (reduces what they owe)
        totalCashIn += cash.amount || 0;
      } else if (cash.type === 'out') {
        // Cash Out means we paid customer/refund (increases what we owe them or reduces what they owe)
        totalCashOut += cash.amount || 0;
      }
    });

    // Outstanding = Invoiced - Paid (invoice credits) - Cash In + Cash Out - Returns + Exchange Difference
    // Invoiced: What customer owes from invoices
    // Paid (invoice.credit): Already paid on specific invoices
    // Cash In: Payments received (reduces what they owe)
    // Cash Out: Refunds/payments to customer (we owe them, so negative to outstanding)
    // Returns: Reduce what customer owes
    // Exchange Difference: Adjust based on exchange
    const outstanding = totalInvoiced - totalPaid - totalCashIn + totalCashOut - totalReturns + totalExchangeDifference;

    return res.status(200).json({
      success: true,
      result: {
        totalInvoiced,
        totalPaid,
        totalCashIn,
        totalCashOut,
        totalReturns,
        totalExchangeDifference,
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
