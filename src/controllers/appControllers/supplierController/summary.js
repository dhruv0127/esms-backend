const mongoose = require('mongoose');
const moment = require('moment');

const summary = async (Model, req, res) => {
  let defaultType = 'month';
  const { type } = req.query;

  if (type && ['week', 'month', 'year'].includes(type)) {
    defaultType = type;
  } else if (type) {
    return res.status(400).json({
      success: false,
      result: null,
      message: 'Invalid type',
    });
  }

  const currentDate = moment();
  let startDate = currentDate.clone().startOf(defaultType);
  let endDate = currentDate.clone().endOf(defaultType);

  const pipeline = [
    {
      $facet: {
        totalSuppliers: [
          {
            $match: {
              removed: false,
              enabled: true,
            },
          },
          {
            $count: 'count',
          },
        ],
        newSuppliers: [
          {
            $match: {
              removed: false,
              created: { $gte: startDate.toDate(), $lte: endDate.toDate() },
              enabled: true,
            },
          },
          {
            $count: 'count',
          },
        ],
      },
    },
  ];

  const aggregationResult = await Model.aggregate(pipeline);

  const result = aggregationResult[0];
  const totalSuppliers = result.totalSuppliers[0] ? result.totalSuppliers[0].count : 0;
  const totalNewSuppliers = result.newSuppliers[0] ? result.newSuppliers[0].count : 0;

  const totalNewSuppliersPercentage = totalSuppliers > 0 ? (totalNewSuppliers / totalSuppliers) * 100 : 0;

  return res.status(200).json({
    success: true,
    result: {
      new: Math.round(totalNewSuppliersPercentage),
      total: totalSuppliers,
    },
    message: 'Successfully get summary of suppliers',
  });
};

module.exports = summary;
