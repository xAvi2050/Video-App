import { Router } from "express";
import { sendResetOTP, resetPassword } from "../controllers/passwordReset.controller.js";

const router = Router();

router.post("/forgot-password", sendResetOTP);
router.post("/reset-password", resetPassword);

export default router;