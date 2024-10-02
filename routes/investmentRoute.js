const { ClaimInvestment, UserInvestments, UserUnclaimInvestments, CreateInvestment } = require('../controllers/investmentController')
const { UserMiddleware } = require('../middleware/auth')




const router = require('express').Router()

router.post('/create-investment', UserMiddleware, CreateInvestment)
router.get('/user-investment', UserMiddleware, UserInvestments)
router.get('/user-unclaim-investment', UserMiddleware, UserUnclaimInvestments)
router.post('/claim-investment', UserMiddleware, ClaimInvestment)


module.exports = router