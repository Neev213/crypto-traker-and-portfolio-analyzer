import { Router } from "express";
import {
    getPortfolio,
    updatePortfolioDetails,
    addHolding,
    updateHolding,
    removeHolding,
    getPortfolioAnalysis,
} from "../controllers/portfolio.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router();

router.use(verifyJWT);

router.get("/", getPortfolio);
router.get("/analysis", getPortfolioAnalysis);
router.patch("/", updatePortfolioDetails);
router.post("/holdings", addHolding);
router.patch("/holdings/:coinId", updateHolding);
router.delete("/holdings/:coinId", removeHolding);

export default router;
