import mongoose from "mongoose";

const alertSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Types.ObjectId,
        ref: "User",
        required: true
    },
    cryptoId: {
        type: String,
        required: true
    },
    targetPrice: {
        type: Number,
        required: true
    },
    condition: {
        type: String,
        enum: ["above", "below"],
        required: true
    },
    isActive: {
        type: Boolean,
        required: true
    },
}, {timestamps: true})

alertSchema.index({ userId: 1 }); // index on userId for fast lookup of user's alerts
alertSchema.index({ isActive: 1 }); // index on isActive for fast lookup of all active alerts

export const Alert = mongoose.model("Alert", alertSchema)