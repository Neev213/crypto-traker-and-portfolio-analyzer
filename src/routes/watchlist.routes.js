import { Router } from "express";
import {
    getWatchlist,
    addToWatchlist,
    removeFromWatchlist,
    getWatchlistMarkets,
} from "../controllers/watchlist.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router();

router.use(verifyJWT);

router.get("/", getWatchlist);
router.get("/markets", getWatchlistMarkets);
router.post("/", addToWatchlist);
router.delete("/:cryptoId", removeFromWatchlist);

export default router;
