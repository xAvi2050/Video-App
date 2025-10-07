import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { createPlaylist, 
    updatePlaylist, 
    deletePlaylist, 
    addVideosToPlaylist, 
    removeVideosFromPlaylist, 
    getPlaylistById, 
    getAllPlaylistsOfUser 
} from "../controllers/playlist.controller.js";

const router = Router();
router.use(verifyJWT);

router.route("/user-playlists").get(getAllPlaylistsOfUser);

router.route("/add-videos/:playlistId/:videoId").patch(addVideosToPlaylist);

router.route("/remove-videos/:playlistId/:videoId").patch(removeVideosFromPlaylist);

router.route("/")
  .post(createPlaylist);

router.route("/:playlistId")
  .get(getPlaylistById)
  .put(updatePlaylist)
  .delete(deletePlaylist);

export default router;