const mongoose = require('mongoose');

const Model = mongoose.model('Purchase');
const ModelPayment = mongoose.model('Payment');

const remove = async (req, res) => {
  const deletedPurchase = await Model.findOneAndUpdate(
    {
      _id: req.params.id,
      removed: false,
    },
    {
      $set: {
        removed: true,
      },
    }
  ).exec();

  if (!deletedPurchase) {
    return res.status(404).json({
      success: false,
      result: null,
      message: 'Purchase not found',
    });
  }

  // You may want to handle payments related to purchases if applicable
  // const paymentsPurchases = await ModelPayment.updateMany(
  //   { purchase: deletedPurchase._id },
  //   { $set: { removed: true } }
  // );

  return res.status(200).json({
    success: true,
    result: deletedPurchase,
    message: 'Purchase deleted successfully',
  });
};

module.exports = remove;
