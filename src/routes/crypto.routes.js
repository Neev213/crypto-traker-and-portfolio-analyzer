import { Router } from "express";
import {
    getMarkets,
    searchCryptocurrencies,
    getCoinById,
    getTrending,
    getPrices,
    syncCryptocurrencies,
    getCachedCryptocurrencies,
} from "../controllers/crypto.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/markets", getMarkets);
router.get("/search", searchCryptocurrencies);
router.get("/trending", getTrending);
router.get("/prices", getPrices);
router.get("/cached", getCachedCryptocurrencies);
router.get("/:cryptoId", getCoinById);

router.post("/sync", verifyJWT, syncCryptocurrencies);

export default router;
