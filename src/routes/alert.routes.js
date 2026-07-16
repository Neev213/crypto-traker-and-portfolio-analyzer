import { Router } from "express";
import {
    getAlerts,
    createAlert,
    updateAlert,
    deleteAlert,
    checkTriggeredAlerts,
} from "../controllers/alert.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router();

router.use(verifyJWT);

router.get("/", getAlerts);
router.get("/triggered", checkTriggeredAlerts);
router.post("/", createAlert);
router.patch("/:alertId", updateAlert);
router.delete("/:alertId", deleteAlert);

export default router;
