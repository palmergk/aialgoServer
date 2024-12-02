const jwt = require('jsonwebtoken')
const User = require('../models').users


exports.AllMiddleware = async (req, res, next) => {
    try {
        const tokenHeader = req.headers.authorization
        if (!tokenHeader) return res.status(403).send('Forbidden')
        const token = tokenHeader.split(' ')[1]
        const verified = jwt.verify(token, process.env.JWT_SECRET)
        if (!verified) return res.json({ status: 404, msg: `Access denied` })
        const findUser = await User.findOne({ where: { id: verified.id } })
        if (!findUser) return res.json({ status: 404, msg: `Invalid account` })
        req.user = findUser.id

        next()
    } catch (error) {
        return res.json({ status: 400, msg: error })
    }
}

exports.UserMiddleware = async (req, res, next) => {
    try {
        const tokenHeader = req.headers.authorization
        if (!tokenHeader) return res.status(403).send('Forbidden')
        const token = tokenHeader.split(' ')[1]
        const verified = jwt.verify(token, process.env.JWT_SECRET)
        if (!verified) return res.json({ status: 404, msg: `Access denied` })
        const findUser = await User.findOne({ where: { id: verified.id } })
        if (!findUser) return res.json({ status: 404, msg: `Invalid account` })
        if (findUser.role !== 'user') return res.json({ status: 404, msg: `Unauthorized Access` })
        req.user = findUser.id

        next()
    } catch (error) {
        return res.json({ status: 400, msg: error })
    }
}

exports.AdminMiddleware = async (req, res, next) => {
    try {
        const tokenHeader = req.headers.authorization
        if (!tokenHeader) return res.status(403).send('Forbidden')
        const token = tokenHeader.split(' ')[1]
        const verified = jwt.verify(token, process.env.JWT_SECRET)
        if (!verified) return res.json({ status: 404, msg: `Access denied` })
        const findUser = await User.findOne({ where: { id: verified.id } })
        if (!findUser) return res.json({ status: 404, msg: `Invalid account` })
        if (findUser.role !== 'admin') return res.json({ status: 404, msg: `Unauthorized Access` })
        req.user = findUser.id

        next()
    } catch (error) {
        return res.json({ status: 400, msg: error })
    }
}