const express = require('express');
const requireAuth = require('../middleware/requireAuth.js'); // ADJUST: match your export style
const requireApprovedSeller = require('../middleware/requireApprovedSeller.js');
const sellerOrderController = require('../controllers/sellerOrderController.js');
const categoryController = require('../controllers/categoryController.js');
const {
  submitApplication,
  getMyApplication,
  updateMyApplication,
  resubmitApplication,
} = require('../controllers/sellerController.js');

const router = express.Router();

router.use(requireAuth);
router.get('/dashboard/overview', requireApprovedSeller, sellerOrderController.dashboard);
router.post('/categories', requireApprovedSeller, categoryController.createSellerCategory);
 
router.post('/application', submitApplication); // apply
router.get('/me', getMyApplication);            // my application/status ({ seller: null } if none)
router.put('/me', updateMyApplication);         // edit (pending: all fields, approved: county/town/description)
router.post('/me/resubmit', resubmitApplication); // rejected -> pending
 

module.exports = router;
 
