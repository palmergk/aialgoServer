const AdminStore = require('../models').admin_store
const sendMail = require('./emailConfig')
require('dotenv').config()

const Mailing = async ({ eTitle, eBody, account, subject }) => {

    const adminStore = await AdminStore.findOne({
    })

    const content = `
        <div style="padding-right: 1rem; padding-left: 1rem; margin-top: 2.5rem">
          <div><img src='https://res.cloudinary.com/dnz3cbnxr/image/upload/v1725460513/myfolder/aoasjh8mldxsezfs9cbe.png'  style="width: 4rem; height: auto"/></div>
          <div style="padding-top: 1.2rem; padding-bottom: 1.2rem; border-top: 1px solid lightgrey; margin-top: 1rem">
             <div style="font-size: 1.1rem; font-weight: bold">${eTitle}</div>
             <div style="margin-top: 1rem">${eBody}</div>
          </div>
          <div style="margin-top: 3rem; padding-top: 1rem; padding-bottom: 1rem; border-top: 1px solid #E96E28;">
             <div style="font-weight: bold; color: #E96E28; text-align: center">Stay connected!</div>
             <div style="margin-top: 1rem">
                 <a href=${adminStore?.facebook} style="padding-left: 6rem"><img src='https://res.cloudinary.com/dnz3cbnxr/image/upload/v1725461777/myfolder/jhjssvvwqe85g7m6ygoj.png' style="width: 1.2rem; height: 1.2rem" /></a>
                 <a href=${adminStore?.instagram} style="padding-left: 1rem"><img src='https://res.cloudinary.com/dnz3cbnxr/image/upload/v1725461786/myfolder/kbkwpgdzajsmlidyserp.png' style="width: 1rem; height: 1rem" /></a>
                 <a href=${adminStore?.twitter} style="padding-left: 1rem"><img src='https://res.cloudinary.com/dnz3cbnxr/image/upload/v1738976416/myfolder/nnbu6j1m3kfffhvldd7t.png' style="width: 1.2rem; height: 1.2rem" /></a>
                 <a href=${adminStore?.telegram} style="padding-left: 1rem"><img src='https://res.cloudinary.com/dnz3cbnxr/image/upload/v1725461793/myfolder/sea7fie6r1mndax4ent8.png' style="width: 1rem; height: 1rem" /></a>
             </div>
             <div style="margin-top: 1rem; font-size: 0.85rem">If you have any questions or suggestions, please feel free to contact us via our 24/7 online help or email: ${process.env.MAIL_USER}</div>
             <div style="margin-top: 1rem;  width: fit-content; height: fit-content; background-color: #172029; color: #94A3B8; font-size: 0.75rem; padding-right: 3rem; padding-left: 3rem; padding-top: 0.75rem; padding-bottom: 0.75rem; display: flex">
                 <img src='https://res.cloudinary.com/dnz3cbnxr/image/upload/v1725463522/qjtwmzzj6orqraedef04.png'  style="width: 0.75rem; height: 0.75rem; margin-top: 0.125rem; padding-right: 0.2rem" />
                 <span>AI Algo 2024, All rights reserved.</span>
              </div>
          </div>
        </div>
    `
    await sendMail({ subject: subject, to: account.email, html: content, text: content, })
}

module.exports = Mailing
