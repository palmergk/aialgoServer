module.exports = (sequelize, DataTypes) => {
    return sequelize.define('adminStore', {
        referral_bonus_percentage: { type: DataTypes.FLOAT, defaultValue: 10 },
        tax_percentage: { type: DataTypes.FLOAT, defaultValue: 10 },
        deposit_minimum: { type: DataTypes.FLOAT, defaultValue: 100 },
        facebook: { type: DataTypes.STRING, defaultValue: 'https://' },
        instagram: { type: DataTypes.STRING, defaultValue: 'https://' },
        twitter: { type: DataTypes.STRING, defaultValue: 'https://' },
        telegram: { type: DataTypes.STRING, defaultValue: 'https://' },
    })
}