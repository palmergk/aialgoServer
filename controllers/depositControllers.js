const Mailing = require('../config/emailDesign')
const Deposit = require('../models').deposits
const Notification = require('../models').notifications
const User = require('../models').users
const AdminStore = require('../models').admin_store
const AdminWallet = require('../models').admin_wallets
const moment = require('moment')
const fs = require('fs')
const otpGenerator = require('otp-generator')
const { webURL } = require('../utils/utils')
const { Op } = require('sequelize')


exports.CreateDeposit = async (req, res) => {
    try {
        const { amount, wallet_id } = req.body
        if (!amount || !wallet_id) return res.json({ status: 404, msg: `Incomplete request found` })
        if (isNaN(amount)) return res.json({ status: 404, msg: `Amount must be a number` })

        const user = await User.findOne({ where: { id: req.user } })
        if (!user) return res.json({ status: 404, msg: 'User not found' })

        const adminStore = await AdminStore.findOne({
        })
        if (adminStore) {
            if (amount < adminStore.deposit_minimum) return res.json({ status: 404, msg: `Minimum deposit amount is $${adminStore.deposit_minimum}` })
        }

        const adminWallet = await AdminWallet.findOne({ where: { id: wallet_id } })
        if (!adminWallet) return res.json({ status: 404, msg: 'Invalid deposit address' })

        if (!req.files) return res.json({ status: 404, msg: `Attach a proof of payment` })
        const filePath = './public/payment_proof'
        const date = new Date()
        const image = req.files.payment_proof
        if (!image.mimetype.startsWith('image/')) return res.json({ status: 404, msg: `File error, upload a valid image format (jpg, jpeg, png, svg)` })
        if (!fs.existsSync(filePath)) {
            fs.mkdirSync(filePath, { recursive: true })
        }
        const imageName = `${date.getTime()}.jpg`
        await image.mv(`${filePath}/${imageName}`)

        const gen_id = `01` + otpGenerator.generate(8, { specialChars: false, lowerCaseAlphabets: false, upperCaseAlphabets: false, })
        
        const deposit = await Deposit.create({
            user: req.user,
            gen_id,
            amount,
            crypto: adminWallet.crypto_name,
            network: adminWallet.network,
            deposit_address: adminWallet.address,
            payment_proof: imageName
        })

        await Notification.create({
            user: req.user,
            title: `deposit success`,
            content: `Your deposit amount of $${deposit.amount.toLocaleString()} was successful, pending confirmation.`,
            URL: '/dashboard/deposit?screen=2',
        })

        const admins = await User.findAll({ where: { role: { [Op.in]: ['admin', 'super admin'] } } })
        if (admins) {
            admins.map(async ele => {

                await Notification.create({
                    user: ele.id,
                    title: `deposit alert`,
                    content: `Hello Admin, ${user.username} just made a deposit of $${deposit.amount.toLocaleString()} with ${deposit.crypto}, please confirm transaction.`,
                    URL: '/admin-controls',
                })

                await Mailing({
                    subject: `Deposit Alert`,
                    eTitle: `New deposit payment`,
                    eBody: `
                     <div style="font-size: 0.85rem"><span style="font-style: italic">amount:</span><span style="padding-left: 1rem">$${deposit.amount.toLocaleString()}</span></div>
                     <div style="font-size: 0.85rem; margin-top: 0.5rem"><span style="font-style: italic">crypto:</span><span style="padding-left: 1rem">${deposit.crypto}</span></div>
                     <div style="font-size: 0.85rem; margin-top: 0.5rem"><span style="font-style: italic">network:</span><span style="padding-left: 1rem">${deposit.network}</span></div>
                     <div style="font-size: 0.85rem; margin-top: 0.5rem"><span style="font-style: italic">deposit address:</span><span style="padding-left: 1rem">${deposit.deposit_address}</span></div>
                     <div style="font-size: 0.85rem; margin-top: 0.5rem"><span style="font-style: italic">sender:</span><span style="padding-left: 1rem">${user.username}</span></div>
                     <div style="font-size: 0.85rem; margin-top: 0.5rem"><span style="font-style: italic">email:</span><span style="padding-left: 1rem">${user.email}</span></div>
                     <div style="font-size: 0.85rem; margin-top: 0.5rem"><span style="font-style: italic">date:</span><span style="padding-left: 1rem">${moment(deposit.createdAt).format('DD-MM-yyyy')}</span></div>
                     <div style="font-size: 0.85rem; margin-top: 0.5rem"><span style="font-style: italic">time:</span><span style="padding-left: 1rem">${moment(deposit.createdAt).format('h:mm')}</span></div>
                     <div style="margin-top: 1rem">Deposit confirmed? Update transaction status <a href='${webURL}/admin-controls' style="text-decoration: underline; color: #E96E28">here</a></div>
                    `,
                    account: ele.dataValues,
                })
            })
        }

        const notifications = await Notification.findAll({
            where: { user: req.user },
            order: [['createdAt', 'DESC']],
        })

        const unreadnotis = await Notification.findAll({
            where: { user: req.user, read: 'false' },
        })

        return res.json({ status: 200, msg: 'Deposit success', notis: notifications, unread: unreadnotis })
    } catch (error) {
        return res.json({ status: 400, msg: error.message })
    }
}

exports.UserDeposits = async (req, res) => {
    try {
        const deposits = await Deposit.findAll({
            where: { user: req.user },
            order: [['createdAt', 'DESC']],
        })

        return res.json({ status: 200, msg: deposits })
    } catch (error) {
        return res.json({ status: 400, msg: error.message })
    }
}
