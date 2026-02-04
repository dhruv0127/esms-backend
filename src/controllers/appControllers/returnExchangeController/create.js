const mongoose = require('mongoose');

const Model = mongoose.model('ReturnExchange');
const CashTransaction = mongoose.model('CashTransaction');

const create = async (req, res) => {
  let body = req.body;

  // Add createdBy from authenticated admin
  body['createdBy'] = req.admin._id;

  // Extract createCashTransaction flag
  const createCashTransaction = body.createCashTransaction;
  delete body.createCashTransaction; // Remove from return/exchange data

  try {
    // Creating a new document in the collection
    body.removed = false;
    const result = await new Model(body).save();

    // Create cash transaction if requested
    if (createCashTransaction) {
      let cashAmount = 0;
      let cashType = 'out'; // Default for returns
      let description = '';

      if (result.type === 'return') {
        // Return: Cash Out (we pay customer back)
        cashAmount = result.returnedItem?.total || 0;
        cashType = 'out';
        description = `Refund for return #${result.number}/${result.year} - ${result.returnedItem?.itemName}`;
      } else if (result.type === 'exchange') {
        // Exchange: Depends on price difference
        const priceDifference = result.priceDifference || 0;

        if (priceDifference > 0) {
          // Customer pays us the difference
          cashAmount = priceDifference;
          cashType = 'in';
          description = `Payment for exchange #${result.number}/${result.year} - Price difference`;
        } else if (priceDifference < 0) {
          // We refund customer the difference
          cashAmount = Math.abs(priceDifference);
          cashType = 'out';
          description = `Refund for exchange #${result.number}/${result.year} - Price difference`;
        }
        // If priceDifference === 0, no cash transaction needed
      }

      // Only create cash transaction if there's an amount
      if (cashAmount > 0) {
        const cashTransactionData = {
          type: cashType,
          amount: cashAmount,
          date: result.date,
          currency: result.currency,
          client: result.customer,
          partyType: 'client',
          description: description,
          reference: `RE-${result.number}/${result.year}`,
          removed: false,
          createdBy: req.admin._id,
        };

        await new CashTransaction(cashTransactionData).save();
      }
    }

    // Populate the result before returning
    const populatedResult = await Model.findById(result._id)
      .populate('customer', 'name')
      .populate('returnedItem.inventory')
      .populate('exchangedItem.inventory');

    // Returning successful response
    return res.status(200).json({
      success: true,
      result: populatedResult,
      message: createCashTransaction
        ? 'Return/Exchange and cash transaction created successfully'
        : 'Return/Exchange created successfully',
    });
  } catch (error) {
    // Handle validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Required fields are not supplied',
        controller: 'create',
        error: error,
      });
    }

    // Handle other errors
    return res.status(500).json({
      success: false,
      result: null,
      message: error.message,
      controller: 'create',
      error: error,
    });
  }
};

module.exports = create;
