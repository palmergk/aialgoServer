
const { GetUserNotifications, DeleteNotification, UpdateAllNotifications, UpdateSingleNotifications, UnreadNotifications } = require('../controllers/notificationController')
const { AllMiddleware } = require('../middleware/auth')

const router = require('express').Router()

router.get('/user-notifications', AllMiddleware, GetUserNotifications)
router.get('/unread-notis', AllMiddleware, UnreadNotifications)
router.put('/update-all', AllMiddleware, UpdateAllNotifications)
router.put('/update-single', AllMiddleware, UpdateSingleNotifications)
router.post('/delete-notification', AllMiddleware, DeleteNotification)

module.exports = router