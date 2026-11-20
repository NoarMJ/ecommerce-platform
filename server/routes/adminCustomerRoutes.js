const express = require('express');
const requireAuth = require('../middleware/requireAuth.js');
const requireAdminPermission = require('../middleware/requireAdminPermission.js');
const { listCustomers } = require('../controllers/adminCustomerController.js');

const router = express.Router();

router.use(requireAuth);

router.get('/', requireAdminPermission('customers.read'), listCustomers);

module.exports = router;
