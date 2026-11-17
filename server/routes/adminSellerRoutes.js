const express = require('express');
const requireAuth = require('../middleware/requireAuth.js');
const requireAdmin = require('../middleware/requireAdmin.js'); // ADJUST: match your export style
const {
  listSellers,
  getSeller,
  approveSeller,
  rejectSeller,
  suspendSeller,
  reactivateSeller,
} = require('../controllers/adminSellerController.js');
 
const router = express.Router();
 
router.use(requireAuth, requireAdmin);
 
router.get('/', listSellers);                        // ?status=&search=&page=&limit=
router.get('/:id', getSeller);
router.post('/:id/approve', approveSeller);          // pending -> approved
router.post('/:id/reject', rejectSeller);            // pending -> rejected (body: { reason })
router.post('/:id/suspend', suspendSeller);          // approved -> suspended
router.post('/:id/reactivate', reactivateSeller);    // suspended -> approved
 
module.exports = router;
 