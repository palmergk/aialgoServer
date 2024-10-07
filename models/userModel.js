module.exports = (sequelize, DataTypes) => {
    return sequelize.define('user', {
        image: { type: DataTypes.STRING, allowNull: true },
        full_name: { type: DataTypes.STRING },
        username: { type: DataTypes.STRING },
        role: { type: DataTypes.STRING, defaultValue: 'user' },
        email: { type: DataTypes.STRING },
        country: { type: DataTypes.STRING },
        country_flag: { type: DataTypes.STRING, allowNull: true },
        referral_id: { type: DataTypes.STRING},
        email_verified: { type: DataTypes.STRING, defaultValue: 'false' },
        kyc_verified: { type: DataTypes.STRING, defaultValue: 'false' },
        resetcode: { type: DataTypes.STRING, allowNull: true },
        password: { type: DataTypes.STRING },
        withdrawal_minimum: { type: DataTypes.FLOAT, defaultValue: 100 },
        my_referral: { type: DataTypes.STRING, allowNull: true},
        suspend: { type: DataTypes.STRING, defaultValue: 'false' },
        account_deletion: { type: DataTypes.STRING, defaultValue: 'false' },
    })
}