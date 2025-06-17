module.exports = (sequelize, DataTypes) => {
    return sequelize.define('withdrawal', {
        user: { type: DataTypes.INTEGER },
        gen_id: { type: DataTypes.STRING },
        amount: { type: DataTypes.FLOAT },
        crypto: { type: DataTypes.STRING },
        network: { type: DataTypes.STRING },
        withdrawal_address: { type: DataTypes.STRING },
        generate: { type: DataTypes.INTEGER, defaultValue: 1 },
        status: { type: DataTypes.STRING, defaultValue: 'processing' },
    })
}