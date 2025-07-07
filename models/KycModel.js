module.exports = (sequelize, DataTypes) => {
    return sequelize.define('kyc', {
        user: { type: DataTypes.INTEGER },
        gen_id: { type: DataTypes.STRING },
        first_name: { type: DataTypes.STRING },
        last_name: { type: DataTypes.STRING },
        gender: { type: DataTypes.STRING },
        marital_status: { type: DataTypes.STRING },
        date_of_birth: { type: DataTypes.STRING },
        country: { type: DataTypes.STRING },
        country_flag: { type: DataTypes.STRING },
        address: { type: DataTypes.STRING },
        state: { type: DataTypes.STRING },
        postal: { type: DataTypes.STRING },
        phone_code: { type: DataTypes.STRING },
        phone_number: { type: DataTypes.STRING },
        id_type: { type: DataTypes.STRING },
        id_number: { type: DataTypes.STRING },
        front_id: { type: DataTypes.STRING },
        back_id: { type: DataTypes.STRING },
        status: { type: DataTypes.STRING, defaultValue: 'processing' },
    })
}