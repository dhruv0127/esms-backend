const mongoose = require('mongoose');

const Model = mongoose.model('CashTransaction');

const create = async (req, res) => {
  try {
    let body = req.body;

    // Set createdBy from authenticated admin
    body['createdBy'] = req.admin._id;
    body['removed'] = false;

    // Creating a new document in the collection
    const result = await new Model(body).save();

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
