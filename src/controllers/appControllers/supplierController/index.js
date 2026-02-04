const mongoose = require('mongoose');
const createCRUDController = require('@/controllers/middlewaresControllers/createCRUDController');

const summary = require('./summary');
const getBalance = require('./getBalance');

function modelController() {
  const Model = mongoose.model('Supplier');
  const methods = createCRUDController('Supplier');

  methods.summary = (req, res) => summary(Model, req, res);
  methods.getBalance = getBalance;
  return methods;
}

module.exports = modelController();
