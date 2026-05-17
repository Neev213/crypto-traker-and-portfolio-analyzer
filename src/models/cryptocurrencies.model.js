import mongoose from "mongoose"

const cryptocurrenciesSchema  = new mongoose.Schema({
    cryptoId: {
        type: String,
        required: true,
        unique: true
    },
    symbol: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    logoUrl: {
        type: String,
        default: ""
    },

}, {timestamps: true})

cryptocurrencySchema.index({ coinId: 1 }); // index on coinId for fast coin lookup

export const Cryptocurrency = mongoose.model("Cryptocurrency", cryptocurrenciesSchema)