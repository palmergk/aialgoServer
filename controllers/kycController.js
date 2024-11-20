const Notification = require('../models').notifications
const User = require('../models').users
const Kyc = require('../models').kyc
const fs = require('fs')
const moment = require('moment')
const { webURL } = require('../utils/utils')
const Mailing = require('../config/emailDesign')



exports.UserKYC = async (req, res) => {
    try {
        const kyc = await Kyc.findOne({ where: { user: req.user } })
        if (!kyc) return res.json({ status: 400, msg: 'User kyc not found' })

        return res.json({ status: 200, msg: kyc })
    } catch (error) {
        return res.json({ status: 400, msg: error.message })
    }
}

exports.Create_Update_KYC = async (req, res) => {
    try {
        const { first_name, last_name, gender, marital_status, country, country_flag, date_of_birth, address, state, postal, phone_code, phone_number, id_number } = req.body
        if (!first_name || !last_name || !gender || !marital_status || !country || !country_flag || !date_of_birth || !address || !state || !postal || !phone_code || !phone_number || !id_number) return res.json({ status: 404, msg: `Incomplete request found` })

        const user = await User.findOne({ where: { id: req.user } })
        if (!user) return res.json({ status: 404, msg: 'User not found' })

        const filePath = './public/identity'
        const date = new Date()
        let imageName;

        const kyc = await Kyc.findOne({ where: { user: req.user } })
        if (!kyc) {

            if (!req.files) return res.json({ status: 404, msg: `Attach a valid ID` })
            const image = req.files.valid_id
            if (!image.mimetype.startsWith('image/')) return res.json({ status: 404, msg: `File error, upload a valid image format (jpg, jpeg, png, svg)` })
            if (!fs.existsSync(filePath)) {
                fs.mkdirSync(filePath)
            }
            imageName = `${date.getTime()}.jpg`
            await image.mv(`${filePath}/${imageName}`)

            const kyc = await Kyc.create({
                user: req.user,
                valid_id: imageName,
                first_name,
                last_name,
                gender,
                marital_status,
                country,
                country_flag,
                date_of_birth,
                address,
                state,
                postal,
                phone_code,
                phone_number,
                id_number
            })

            await Notification.create({
                user: req.user,
                title: `KYC submitted`,
                content: `Your kyc details received and processing for verification.`,
                URL: '/dashboard/settings/kyc',
            })

            const admins = await User.findAll({ where: { role: 'admin' } })
            if (admins) {
                admins.map(async ele => {

                    await Notification.create({
                        user: ele.id,
                        title: `KYC submission alert`,
                        content: `Hello Admin, ${user.username} just submitted KYC details, verify authenticity.`,
                        role: 'admin',
                        URL: '/admin-controls/users',
                    })

                    await Mailing({
                        subject: `KYC Submission Alert`,
                        eTitle: `New KYC uploaded`,
                        eBody: `
                          <div>Hello Admin, ${user.username} just submitted KYC details today ${moment(kyc.createdAt).format('DD-MM-yyyy')} / ${moment(kyc.createdAt).format('h:mm')} verify authenticity <a href='${webURL}/admin-controls/users' style="text-decoration: underline; color: #E96E28">here</a></div>
                        `,
                        account: ele.dataValues
                    })
                })
            }
        }
        else {
            if (kyc.status === 'verified') return res.json({ status: 404, msg: 'KYC is verified' })

            const image = req?.files?.valid_id
            if (image) {
                if (!image.mimetype.startsWith('image/')) return res.json({ status: 404, msg: `File error, upload a valid image format (jpg, jpeg, png, svg)` })
                const currentImagePath = `${filePath}/${kyc.valid_id}`
                if (fs.existsSync(currentImagePath)) {
                    fs.unlinkSync(currentImagePath)
                }
                if (!fs.existsSync(filePath)) {
                    fs.mkdirSync(filePath)
                }
                imageName = `${date.getTime()}.jpg`
                await image.mv(`${filePath}/${imageName}`)
                kyc.valid_id = imageName
            }

            kyc.first_name = first_name
            kyc.last_name = last_name
            kyc.gender = gender
            kyc.marital_status = marital_status
            kyc.country = country
            kyc.country_flag = country_flag,
            kyc.phone_code = phone_code
            kyc.postal = postal
            kyc.phone_number = phone_number
            kyc.state = state
            kyc.address = address
            kyc.id_number = id_number
            kyc.date_of_birth = date_of_birth
            kyc.status = 'processing'
            await kyc.save()

            await Notification.create({
                user: req.user,
                title: `KYC re-uploaded`,
                content: `Your updated kyc details received and processing for verification.`,
                URL: '/dashboard/settings/kyc',
            })

            const admins = await User.findAll({ where: { role: 'admin' } })
            if (admins) {
                admins.map(async ele => {

                    await Notification.create({
                        user: ele.id,
                        title: `KYC re-upload alert`,
                        content: `Hello Admin, ${user.username} re-uploaded KYC details, verify authenticity.`,
                        role: 'admin',
                        URL: '/admin-controls/users',
                    })

                    await Mailing({
                        subject: `KYC Re-upload Alert`,
                        eTitle: `KYC re-uploaded`,
                        eBody: `
                          <div>Hello Admin, ${user.username} re-uploaded KYC details today ${moment(kyc.updatedAt).format('DD-MM-yyyy')} / ${moment(kyc.updatedAt).format('h:mm')}  verify authenticity <a href='${webURL}/admin-controls/users' style="text-decoration: underline; color: #E96E28">here</a></div>
                        `,
                        account: ele.dataValues
                    })
                })
            }
        }

        const notifications = await Notification.findAll({
            where: { user: req.user },
            order: [['createdAt', 'DESC']],
        })

        const unreadnotis = await Notification.findAll({
            where: { user: req.user, read: 'false' },
        })

        return res.json({ status: 200, msg: 'Details submitted', notis: notifications, unread: unreadnotis })
    } catch (error) {
        return res.json({ status: 400, msg: error.message })
    }
}