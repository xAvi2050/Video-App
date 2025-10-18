import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { getAboutChannel } from "../controllers/about.controller.js";

const router = Router();
router.use(verifyJWT);

router.route("/:username/about").get(getAboutChannel);

export default router;