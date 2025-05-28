const Notification = require('../models').notifications
const User = require('../models').users
const Kyc = require('../models').kyc
const fs = require('fs')
const moment = require('moment')
const slug = require('slug')
const otpGenerator = require('otp-generator')
const { webURL } = require('../utils/utils')
const Mailing = require('../config/emailDesign')
const { Op } = require('sequelize')



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
        const { full_name, gender, marital_status, country, country_flag, date_of_birth, address, state, postal, phone_code, phone_number, id_number } = req.body
        if (!full_name || !gender || !marital_status || !country || !country_flag || !date_of_birth || !address || !state || !postal || !phone_code || !phone_number || !id_number) return res.json({ status: 404, msg: `Incomplete request found` })

        const user = await User.findOne({ where: { id: req.user } })
        if (!user) return res.json({ status: 404, msg: 'User not found' })
        const admins = await User.findAll({ where: { role: { [Op.in]: ['admin', 'super admin'] } } })
        const kyc = await Kyc.findOne({ where: { user: req.user } })

        const gen_id = `01` + otpGenerator.generate(8, { specialChars: false, lowerCaseAlphabets: false, upperCaseAlphabets: false, })
        const slugData = slug(user.username, '-')
        const date = new Date()
        const filePath = `./public/identity/${kyc ? kyc.gen_id : gen_id}`
        const frontImageName = `${slugData}_frontID${date.getTime()}.jpg`
        const backImageName = `${slugData}_backID${date.getTime()}.jpg`

        if (!kyc) {
            if (!req.files || !req.files.front_id || !req.files.back_id) return res.json({ status: 404, msg: `Attach a valid front and back ID` })
            const frontImage = req.files.front_id
            const backImage = req.files.back_id
            if (!frontImage.mimetype.startsWith('image/') || !backImage.mimetype.startsWith('image/')) return res.json({ status: 404, msg: `File error, upload valid images format (jpg, jpeg, png, svg)` })
            if (!fs.existsSync(filePath)) {
                fs.mkdirSync(filePath, { recursive: true })
            }
            await frontImage.mv(`${filePath}/${frontImageName}`)
            await backImage.mv(`${filePath}/${backImageName}`)

            const kyc = await Kyc.create({
                user: req.user,
                front_id: frontImageName,
                back_id: backImageName,
                gen_id: gen_id,
                full_name,
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
            if (kyc.status === 'processing') return res.json({ status: 404, msg: `You can't re-upload while KYC details is processing` })
            if (kyc.status === 'verified') return res.json({ status: 404, msg: 'KYC is verified' })

            const frontImage = req?.files?.front_id
            const backImage = req?.files?.back_id
            if (frontImage) {
                if (!frontImage.mimetype.startsWith('image/')) return res.json({ status: 404, msg: `File error, upload a valid image format (jpg, jpeg, png, svg)` })
                const currentImagePath = `${filePath}/${kyc.front_id}`
                if (fs.existsSync(currentImagePath)) {
                    fs.unlinkSync(currentImagePath)
                }
                if (!fs.existsSync(filePath)) {
                    fs.mkdirSync(filePath, { recursive: true })
                }
                await frontImage.mv(`${filePath}/${frontImageName}`)
                kyc.front_id = frontImageName
            }
            if (backImage) {
                if (!backImage.mimetype.startsWith('image/')) return res.json({ status: 404, msg: `File error, upload a valid image format (jpg, jpeg, png, svg)` })
                const currentImagePath = `${filePath}/${kyc.back_id}`
                if (fs.existsSync(currentImagePath)) {
                    fs.unlinkSync(currentImagePath)
                }
                if (!fs.existsSync(filePath)) {
                    fs.mkdirSync(filePath, { recursive: true })
                }
                await backImage.mv(`${filePath}/${backImageName}`)
                kyc.back_id = backImageName
            }

            kyc.full_name = full_name
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