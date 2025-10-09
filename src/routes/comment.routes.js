import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { addComment, 
    updateComment, 
    deleteComment, 
    getAllCommentsOfAVideo 
} from "../controllers/comment.controller.js";

const router = Router();
router.use(verifyJWT);

router.route("/video-comments/:videoId").get(getAllCommentsOfAVideo);

router.route("/:videoId")
  .post(addComment);

router.route("/c/:commentId")
  .patch(updateComment)
  .delete(deleteComment);

export default router;