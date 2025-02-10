
const { GetUserNotifications, DeleteNotification, UpdateAllNotifications, UpdateSingleNotification, UnreadNotifications } = require('../controllers/notificationController')
const { AllMiddleware } = require('../middleware/auth')

const router = require('express').Router()

router.get('/user-notifications', AllMiddleware, GetUserNotifications)
router.get('/unread-notis', AllMiddleware, UnreadNotifications)
router.put('/update-all', AllMiddleware, UpdateAllNotifications)
router.put('/update-single', AllMiddleware, UpdateSingleNotification)
router.post('/delete-notification', AllMiddleware, DeleteNotification)

module.exports = router