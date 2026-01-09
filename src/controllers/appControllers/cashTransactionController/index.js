const mongoose = require('mongoose');
const createCRUDController = require('@/controllers/middlewaresControllers/createCRUDController');

const summary = require('./summary');
const create = require('./create');

function modelController() {
  const Model = mongoose.model('CashTransaction');
  const methods = createCRUDController('CashTransaction');

  methods.summary = (req, res) => summary(Model, req, res);
  methods.create = create;
  return methods;
}

module.exports = modelController();
