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
        totalCashIn: [
          {
            $match: {
              removed: false,
              enabled: true,
              type: 'in',
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$amount' },
            },
          },
        ],
        totalCashOut: [
          {
            $match: {
              removed: false,
              enabled: true,
              type: 'out',
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$amount' },
            },
          },
        ],
        periodCashIn: [
          {
            $match: {
              removed: false,
              enabled: true,
              type: 'in',
              date: { $gte: startDate.toDate(), $lte: endDate.toDate() },
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$amount' },
            },
          },
        ],
        periodCashOut: [
          {
            $match: {
              removed: false,
              enabled: true,
              type: 'out',
              date: { $gte: startDate.toDate(), $lte: endDate.toDate() },
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$amount' },
            },
          },
        ],
        transactionCount: [
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
      },
    },
  ];

  const aggregationResult = await Model.aggregate(pipeline);

  const result = aggregationResult[0];
  const totalCashIn = result.totalCashIn[0] ? result.totalCashIn[0].total : 0;
  const totalCashOut = result.totalCashOut[0] ? result.totalCashOut[0].total : 0;
  const periodCashIn = result.periodCashIn[0] ? result.periodCashIn[0].total : 0;
  const periodCashOut = result.periodCashOut[0] ? result.periodCashOut[0].total : 0;
  const transactionCount = result.transactionCount[0] ? result.transactionCount[0].count : 0;

  const netBalance = totalCashIn - totalCashOut;
  const periodNetBalance = periodCashIn - periodCashOut;

  return res.status(200).json({
    success: true,
    result: {
      totalCashIn,
      totalCashOut,
      netBalance,
      periodCashIn,
      periodCashOut,
      periodNetBalance,
      transactionCount,
      period: defaultType,
    },
    message: 'Successfully get summary of cash transactions',
  });
};

module.exports = summary;
