const mongoose = require('mongoose');

const Purchase = mongoose.model('Purchase');

const getBalance = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Supplier ID is required',
      });
    }

    // Get all purchases for this supplier
    const purchases = await Purchase.find({
      supplier: id,
      removed: false,
    }).lean();

    // Calculate total outstanding
    let totalPurchased = 0;
    let totalPaid = 0;

    purchases.forEach((purchase) => {
      totalPurchased += purchase.total || 0;
      totalPaid += purchase.credit || 0;
    });

    const outstanding = totalPurchased - totalPaid;

    return res.status(200).json({
      success: true,
      result: {
        totalPurchased,
        totalPaid,
        outstanding,
      },
      message: 'Successfully fetched supplier balance',
    });
  } catch (error) {
    console.error('Error fetching supplier balance:', error);
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error fetching supplier balance: ' + error.message,
    });
  }
};

module.exports = getBalance;
