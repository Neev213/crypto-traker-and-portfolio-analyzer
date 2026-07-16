import { Router } from "express";
import {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    getCurrentUser,
    updateAccountDetails,
    updateAvatar,
    changePassword,
    deleteAccount,
} from "../controllers/user.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/multer.middleware.js";

const router = Router();

router.post("/register", upload.single("avatar"), registerUser);
router.post("/login", loginUser);
router.post("/refresh-token", refreshAccessToken);

router.post("/logout", verifyJWT, logoutUser);
router.get("/me", verifyJWT, getCurrentUser);
router.patch("/update-details", verifyJWT, updateAccountDetails);
router.patch("/update-avatar", verifyJWT, upload.single("avatar"), updateAvatar);
router.patch("/change-password", verifyJWT, changePassword);
router.delete("/delete-account", verifyJWT, deleteAccount);

export default router;
