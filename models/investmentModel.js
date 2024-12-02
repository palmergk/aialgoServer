module.exports = (sequelize, DataTypes) => {
    return sequelize.define('investment', {
        user: {type: DataTypes.INTEGER},
        gen_id: {type: DataTypes.STRING},
        amount: {type: DataTypes.FLOAT},
        trading_plan: {type: DataTypes.STRING},
        plan_id: {type: DataTypes.INTEGER},
        profit: {type: DataTypes.FLOAT, defaultValue: 0},
        bonus: {type: DataTypes.FLOAT, defaultValue: 0},
        status: {type: DataTypes.STRING, defaultValue: 'running'},
        claim: {type: DataTypes.STRING, defaultValue: 'false'},
        endDate: {type: DataTypes.STRING},
        topupTime: {type: DataTypes.STRING},
    })
}