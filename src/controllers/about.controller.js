import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const getAboutChannel = asyncHandler(async (req, res) => {
    const { username } = req.params;

    // Find the user by username
    const user = await User.findOne({ username }).select("fullName bio createdAt");
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    const userAbout = await User.aggregate([
        { 
            $match: { username: username }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "_id",
                foreignField: "owner",
                as: "videos"
            }
        },
        {
            $addFields: {
                subscribersCount: { $size: "$subscribers" },
                videosCount: { $size: "$videos" },
                totalVideoViews: { $sum: "$videos.views" }
            }
        },
        {
            $project: {
                _id: 1,
                fullName: 1,
                bio: 1, // or bio if your field is called bio
                createdAt: 1,
                subscribersCount: 1,
                videosCount: 1,
                totalVideoViews: 1
            }
        }
    ]);

    if (!userAbout || userAbout.length === 0) {
        throw new ApiError(404, "User not found");
    }

    return res.status(200).json(
        new ApiResponse(200, userAbout[0], "User About information fetched successfully")
    );
});

export { getAboutChannel };