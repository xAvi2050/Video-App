import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { 
    createTweet, 
    updateTweet, 
    deleteTweet, 
    getUserTweets 
} from "../controllers/tweet.controller.js";

const router = Router();

router.use(verifyJWT);

router.route("/create").post(createTweet);
router.route("/update/:tweetId").patch(updateTweet);
router.route("/delete/:tweetId").delete(deleteTweet);
router.route("/user/:userId").get(getUserTweets);

export default router;