const Notification = require('../models').notifications

exports.GetUserNotifications = async (req, res) => {
    try {
        const notifications = await Notification.findAll({
            where: { user: req.user },
            order: [['createdAt', 'DESC']],
        })

        return res.json({ status: 200, msg: notifications })
    } catch (error) {
        res.json({ status: 500, msg: error.message })
    }
}

exports.UnreadNotifications = async (req, res) => {
    try {
        const notifications = await Notification.findAll({
            where: { user: req.user, read: 'false' },
        })

        return res.json({ status: 200, msg: notifications })
    } catch (error) {
        res.json({ status: 500, msg: error.message })
    }
}

exports.UpdateAllNotifications = async (req, res) => {

    try {
        const notifications = await Notification.findAll({
            where: { user: req.user },
            order: [['createdAt', 'DESC']],
        })

        if (!notifications) return res.json({ status: 404, msg: 'Notifications not found' })

        notifications.map(async ele => {
            ele.read = "true"
            await ele.save()
        })

        return res.json({ status: 200, msg: 'Notifications updated successfully' })
    } catch (error) {
        res.json({ status: 500, msg: error.message })
    }
}

exports.UpdateSingleNotification = async (req, res) => {
    try {
        const { notification_id } = req.body
        if (!notification_id) return res.json({ status: 404, msg: `Notification id is required` })

        const notification = await Notification.findOne({ where: { id: notification_id } })
        if (!notification) return res.json({ status: 404, msg: 'Notification not found' })

        if (notification.user !== req.user) return res.json({ status: 400, msg: 'You are not authorized to process this data' })

        notification.read = 'true'
        await notification.save()

        return res.json({ status: 200, msg: 'Notification updated successfully' })
    } catch (error) {
        res.json({ status: 500, msg: error.message })
    }
}

exports.DeleteNotification = async (req, res) => {
    try {

        const { notification_id } = req.body
        if (!notification_id) return res.json({ status: 404, msg: `Notification id is required` })

        const notification = await Notification.findOne({ where: { id: notification_id } })
        if (!notification) return res.json({ status: 404, msg: 'Notification not found' })

        if (notification.user !== req.user) return res.json({ status: 400, msg: 'You are not authorized to process this data' })

        await notification.destroy()

        const notifications = await Notification.findAll({
            where: { user: req.user },
            order: [['createdAt', 'DESC']],
        })

        return res.json({ status: 200, msg: notifications })
    } catch (error) {
        res.json({ status: 500, msg: error.message })
    }
}
