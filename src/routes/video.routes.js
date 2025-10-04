import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
    publishAVideo,
    getAllVideos,
    getVideoById,
    updateAVideo,
    deleteAVideo,
    togglePublishStatus,
    searchVideos
} from "../controllers/video.controller.js";

const router = Router();

router.use(verifyJWT);

router.route("/publish").post(
    upload.fields([
        { name: "videoFile", maxCount: 1 },
        { name: "thumbnail", maxCount: 1 },
    ]),
    publishAVideo
);

router.route("/user/:username").get(
    getAllVideos
);

router.route("/v/:videoId").get(
    getVideoById
);

router.route("/v/:videoId/update").put(
    upload.fields([
        { name: "thumbnail", maxCount: 1 },
    ]),
    updateAVideo
);

router.route("/v/:videoId/delete").delete(
    deleteAVideo
);

router.route("/v/:videoId/toggle-publish").patch(
    togglePublishStatus
);

router.route("/search").get(
    searchVideos
)

export default router;