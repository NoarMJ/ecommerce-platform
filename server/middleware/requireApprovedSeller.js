const sellerRepository = require('../repositories/seller.repository');

module.exports = async function 
requireApprovedSeller(req, res, next) {
    try{
        const profile= await
        sellerRepository.findByUserId(req.userId);

        if (!profile) {
            return res.status(403).json({
                statue: 'error',
                message: ' Apply to become a seller first',
            });
        }

        if(profile.status !== 'approved') {
            return res.status(403).json({
                status: 'error',
                message: `Your seller account is ${profile.status}.`,
            });
        }

        req.seller = profile;

        return next();
    }
    catch (error) {
        return next (error);
    }
};