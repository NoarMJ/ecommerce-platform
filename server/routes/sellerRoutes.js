const express = require('express');
const requireAuth = require('../middleware/requireAuth.js'); // ADJUST: match your export style
const {
  submitApplication,
  getMyApplication,
  updateMyApplication,
  resubmitApplication,
} = require('../controllers/sellerController.js');

const router = express.Router();

router.use(requireAuth);
 
router.post('/application', submitApplication); // apply
router.get('/me', getMyApplication);            // my application/status ({ seller: null } if none)
router.put('/me', updateMyApplication);         // edit (pending: all fields, approved: county/town/description)
router.post('/me/resubmit', resubmitApplication); // rejected -> pending
 

module.exports = router;
 
