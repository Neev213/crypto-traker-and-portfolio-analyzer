import mongoose from "mongoose";

const priceHistorySchema = new mongoose.Schema({
    cryptoId: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    recordedAt: {
        type: Date,
        required: true
    }
}, {timestamps: false})

priceHistorySchema.index({ coinId: 1 }); // index on coinId for fast lookup of a coin's history
priceHistorySchema.index({ coinId: 1, recordedAt: -1 }); // compound index — gets latest prices first for a specific coin

export const PriceHistory = mongoose.model("PriceHistory", priceHistorySchema)