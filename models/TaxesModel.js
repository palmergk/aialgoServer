module.exports = (sequelize, DataTypes) => {
    return sequelize.define('taxes', {
        user: { type: DataTypes.INTEGER },
        amount: { type: DataTypes.FLOAT },
        crypto: { type: DataTypes.STRING },
        network: { type: DataTypes.STRING },
        deposit_address: { type: DataTypes.STRING },
        status: { type: DataTypes.STRING, defaultValue: 'processing' },
    })
}