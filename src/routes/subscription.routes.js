import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { 
    toggleSubscription, 
    getUserChannelSubscribers,
    getSubscriptionList
} from "../controllers/subscription.controller.js";

const router = Router();
router.use(verifyJWT);

router
    .route("/c/:channelId")
    .post(toggleSubscription)
    .get(getUserChannelSubscribers);

// Get all channels that a user has subscribed to
router.route("/u/subscribed-channels").get(getSubscriptionList);

export default router;