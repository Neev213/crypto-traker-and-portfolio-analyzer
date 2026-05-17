import mongoose from "mongoose";

const watchlistSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Types.ObjectId,
        ref: "User"
    },
    cryptoId: {
        type: String,
        required: true
    },
    addedAt: {
    type: Date, // stores the date when coin was added to watchlist
    default: Date.now, // defaults to current date and time
    },
}, {timestamps: true})

watchListSchema.index({ userId: 1 }); // index on userId for fast lookup of user's watchlist
watchListSchema.index({ userId: 1, coinId: 1 }, { unique: true }); // prevent same coin being added twice by same user


export const Watchlist = mongoose.model("Watchlist", watchlistSchema)