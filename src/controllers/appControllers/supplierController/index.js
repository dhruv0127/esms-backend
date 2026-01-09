const mongoose = require('mongoose');
const createCRUDController = require('@/controllers/middlewaresControllers/createCRUDController');

const summary = require('./summary');

function modelController() {
  const Model = mongoose.model('Supplier');
  const methods = createCRUDController('Supplier');

  methods.summary = (req, res) => summary(Model, req, res);
  return methods;
}

module.exports = modelController();
