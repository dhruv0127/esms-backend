const mongoose = require('mongoose');
const Model = mongoose.model('Inventory');
const createCRUDController = require('@/controllers/middlewaresControllers/createCRUDController');
const methods = createCRUDController('Inventory');

module.exports = methods;
