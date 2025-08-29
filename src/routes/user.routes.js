import { Router } from "express";
import { loginUser,
    logoutUser, 
    registerUser, 
    refreshAccessToken, 
    changeCurrentPassword, 
    updateAccountDetails, 
    deleteAccount } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(
    upload.fields([
        { name: "avatar", maxCount: 1 },
        { name: "coverImage", maxCount: 1 },
    ]),
    registerUser
);

router.route("/login").post(
    loginUser
);

//secured routes
router.route("/logout").post(
    verifyJWT,
    logoutUser
);

router.route("/refresh-token").post(
    refreshAccessToken
);

router.route("/change-password").post(
    verifyJWT,
    changeCurrentPassword
);

router.route("/account-update").post(
    verifyJWT,
    upload.fields([
        { name: "avatar", maxCount: 1 },
        { name: "coverImage", maxCount: 1 },
    ]),
    updateAccountDetails
);

router.route("/delete-account").post(
    verifyJWT,
    deleteAccount
);

export default router;