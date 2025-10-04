import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { Video } from "../models/video.model.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { Comment } from "../models/comment.model.js";


const publishAVideo = asyncHandler(async (req, res) => {
	const { title, description } = req.body;

	if (!title || !description) {
		throw new ApiError(400, "Title and description are required");
	}

	const videoFileLocalPath = req.files?.videoFile?.[0]?.path;
	const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;

	if (!videoFileLocalPath) {
		throw new ApiError(400, "Video file is required");
	}

	if (!thumbnailLocalPath) {
		throw new ApiError(400, "Thumbnail is required");
	}

	const videoFile = await uploadOnCloudinary(videoFileLocalPath);
	const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

	if (!videoFile) {
		throw new ApiError(500, "Video upload failed");
	}

	if (!thumbnail) {
		throw new ApiError(500, "Thumbnail upload failed");
	}

	const video = await Video.create({
		title,
		description,
		thumbnail: {
			url: thumbnail?.url,
			public_id: thumbnail?.public_id
		},
		videoFile: {
			url: videoFile?.url,
			public_id: videoFile?.public_id
		},
		duration: videoFile?.duration,
		owner: req.user._id
	});

	const uploadedVideo = await Video.findById(video._id);

	if (!uploadedVideo) {
		throw new ApiError(500, "Failed to upload video");
	}

	return res
		.status(200)
		.json(new ApiResponse(200, video, "Video published successfully"));
});

const MAX_LIMIT = 100;

const getAllVideos = asyncHandler(async (req, res) => {
	const { page = 1, limit = 10, sortBy, sortType } = req.query;
	const { username } = req.params;

	let userId;
	if (username) {
		const user = await User.findOne({ username });
		if (!user) throw new ApiError(404, "User not found");
		userId = user.id;
	}

	let pageNum = parseInt(page, 10);
	if (isNaN(pageNum) || pageNum < 1) pageNum = 1;

	let limitNum = parseInt(limit, 10);
	if (isNaN(limitNum) || limitNum < 1) limitNum = 10;
	limitNum = Math.min(limitNum, MAX_LIMIT);

	const ALLOWEDSORTS = new Set(["views", "createdAt", "duration"]);
	const sortField = ALLOWEDSORTS.has(sortBy) ? sortBy : "createdAt";
	const sortDirection = sortType === "asc" ? 1 : -1;

	const pipeline = [];
	if (userId) {
		if (!mongoose.isValidObjectId(userId)) throw new ApiError(400, "Invalid userId");
		pipeline.push({ $match: { owner: new mongoose.Types.ObjectId(userId) } });
	}
	pipeline.push({ $match: { isPublished: true } });
	pipeline.push({ $sort: { [sortField]: sortDirection } });
	pipeline.push({
		$lookup: {
			from: "users",
			localField: "owner",
			foreignField: "_id",
			as: "ownerDetails"
		}
	});
	pipeline.push({ $unwind: "$ownerDetails" });
	pipeline.push({
		$project: {
			title: 1,
			description: 1,
			videoFile: 1,
			thumbnail: 1,
			duration: 1,
			views: 1,
			createdAt: 1,
			owner: 1,
			"ownerDetails.username": 1,
			"ownerDetails.avatar.url": 1
		}
	});

	const options = { page: pageNum, limit: limitNum };
	const videos = await Video.aggregatePaginate(pipeline, options);

	return res
		.status(200)
		.json(new ApiResponse(200, videos, "Videos fetched successfully"));
});

const getVideoById = asyncHandler(async (req, res) => {
	const { videoId } = req.params;

	if (!isValidObjectId(videoId)) {
		throw new ApiError(400, "Invalid videoId");
	}

	const video = await Video.aggregate([
		{
			$match: {
				_id: new mongoose.Types.ObjectId(videoId),
				isPublished: true
			}
		},
		{
			$lookup: {
				from: "likes",
				localField: "_id",
				foreignField: "video",
				as: "likes"
			}
		},
		{
			$lookup: {
				from: "comments",
				localField: "_id",
				foreignField: "video",
				as: "comments"
			}
		},
		{
			$lookup: {
				from: "users",
				localField: "owner",
				foreignField: "_id",
				as: "owner",
				pipeline: [
					{
						$lookup: {
							from: "subscriptions",
							localField: "_id",
							foreignField: "channel",
							as: "subscribers"
						}
					},
					{
						$addFields: {
							subscribersCount: {
								$size: "$subscribers"
							},
							isSubscribed: {
								$cond: {
									if: {
										$in: [
											req.user?._id,
											"$subscribers.subscriber"
										]
									},
									then: true,
									else: false
								}
							}
						}
					},
					{
						$project: {
							username: 1,
							"avatar.url": 1,
							subscribersCount: 1,
							isSubscribed: 1
						}
					}
				]
			}
		},
		{
			$addFields: {
				likesCount: { $size: "$likes" },
				isLiked: {
					$cond: {
						if: { $in: [req.user?._id, "$likes.likedBy"] },
						then: true,
						else: false
					}
				}
			}
		},
		{
			$project: {
				videoFile: 1,
				title: 1,
				description: 1,
				duration: 1,
				views: 1,
				createdAt: 1,
				owner: 1,
				likesCount: 1,
				isLiked: 1
			}
		}
	]);

	if(!video || video.length === 0) {
		throw new ApiError(500, "Failed to fetch video");
	}

	// incrementing the views if video fetched successfully
	await Video.findByIdAndUpdate(videoId, {
		$inc: {
			views: 1
		}
	});

	// add this video to the user's watchHistory Array
	await User.findByIdAndUpdate(req.user?._id, {
		$addToSet: {
			watchHistory: videoId
		}
	});

	return res
		.status(200)
		.json(
			new ApiResponse(200, video[0], "Video fetched successfully"));
});

const updateAVideo = asyncHandler(async (req, res) => {
	const { videoId } = req.params;
	const { title, description } = req.body;

	if (!isValidObjectId(videoId)) {
		throw new ApiError(400, "Invalid videoId");
	}

	const video = await Video.findById(videoId);
	if (!video) {
		throw new ApiError(404, "Video not found");
	}

	if (video?.owner.toString() !== req.user._id.toString()) {
		throw new ApiError(403, "You are not authorized to update this video");
	}

	const updateData = {};
	if (title) updateData.title = title;
	if (description) updateData.description = description;

	const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;
	let thumbnailToDelete;

	if (thumbnailLocalPath) {
		const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
		if (!thumbnail) {
			throw new ApiError(500, "Thumbnail upload failed");
		}
		updateData.thumbnail = {
			public_id: thumbnail.public_id,
			url: thumbnail.url
		};
		thumbnailToDelete = video.thumbnail?.public_id;
	}

	// Don't attempt update if no fields passed
	if (Object.keys(updateData).length === 0) {
		return res
			.status(200)
			.json(new ApiResponse(200, video, "Nothing to update"));
	}

	const updatedVideo = await Video.findByIdAndUpdate(
		videoId,
		{ $set: updateData },
		{
			new: true,
			select: "title description thumbnail"
		}
	);

	if (!updatedVideo) {
		throw new ApiError(500, "Failed to update video");
	}

	if (thumbnailToDelete) {
		await deleteFromCloudinary(thumbnailToDelete);
	}

	return res
		.status(200)
		.json(new ApiResponse(200, updatedVideo, "Video updated successfully"));
});

const deleteAVideo = asyncHandler(async (req, res) => {
	const { videoId } = req.params;
	if (!isValidObjectId(videoId)) {
		throw new ApiError(400, "Invalid videoId");
	}

	const video = await Video.findById(videoId);
	if (!video) {
		throw new ApiError(404, "Video not found");
	}

	if (video?.owner.toString() !== req.user._id.toString()) {
		throw new ApiError(403, "You are not authorized to delete this video");
	}

	const videoDeleted = await Video.findByIdAndDelete(videoId);
	if (!videoDeleted) {
		throw new ApiError(500, "Failed to delete video");
	}

	try {
		// Delete from Cloudinary
		await deleteFromCloudinary(video.videoFile?.public_id);
		await deleteFromCloudinary(video.thumbnail?.public_id);

		// Delete related Likes and Comments
		await Like.deleteMany({ video: videoId });
		await Comment.deleteMany({ video: videoId });

	} catch (error) {
		console.error("Error during video deletions:", error);
		throw new ApiError(500, "Failed to completely delete the video and it's resources");
	}

	return res
		.status(200)
		.json(new ApiResponse(200, {}, "Video deleted successfully"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
	const { videoId } = req.params;
	if (!isValidObjectId(videoId)) {
		throw new ApiError(400, "Invalid videoId");
	}

	const video = await Video.findById(videoId);
	if (!video) {
		throw new ApiError(404, "Video not found");
	}

	if (video?.owner.toString() !== req.user._id.toString()) {
		throw new ApiError(403, "You are not authorized to change the publish status of this video");
	}

	const toggledVideoPublish = await Video.findByIdAndUpdate(
		videoId,
		{ $set: { isPublished: !video?.isPublished } },
		{ new: true} // the function returns the updated document after the modification, not the original one before the update
	);

	if (!toggledVideoPublish) {
		throw new ApiError(500, "Failed to update video publish status");
	}

	return res
		.status(200)
		.json(
			new ApiResponse(
				200, 
				{ isPublished: toggledVideoPublish.isPublished },
				"Video publish status updated successfully"
			)
		);
});

const searchVideos = asyncHandler(async (req, res) => {
	const { query, page = 1, limit = 10 } = req.query;
	if (!query || query.trim() === "") {
		throw new ApiError(400, "Search query is required");
	}

	const pageNum = Math.max(parseInt(page, 10), 1);
	const limitNum = Math.min(Math.max(parseInt(limit, 10), 1), MAX_LIMIT);

	const matchStage = {
		title: {
			$regex: query,
			$options: "i" // case-insensitive
		},
		isPublished: true
	}

	const pipeline = [
		{ $match: matchStage },
		{
			$lookup: {
				from: "users",
				localField: "owner",
				foreignField: "_id",
				as: "ownerDetails"
			}
		},
		{ $unwind: "$ownerDetails" },
		{
			$lookup: {
				from: "likes",
				localField: "_id",
				foreignField: "video",
				as: "likes"
			}
		},
		{
			$lookup: {
				from: "comments",
				localField: "_id",
				foreignField: "video",
				as: "comments"
			}
		},
		{
			$addFields: {
				likesCount: { $size: "$likes" },
				commentsCount: { $size: "$comments" },
				timeSinceUpload: {
					$dateDiff: {
						startDate: "$createdAt",
						endDate: "$$NOW",
						unit: "day"
					}
				}
			}
		},
		{
			$project: {
				videoFile: 1,
				thumbnail: 1,
				title: 1,
				description: 1,
				views: 1,
				likesCount: 1,
				commentsCount: 1,
				duration: 1,
				createdAt: 1,
				timeSinceUpload: 1,
				"ownerDetails.avatar.url": 1,
				"ownerDetails.fullName": 1
			}
		},
		{
			$skip: (pageNum - 1) * limitNum
		},
		{
			$limit: limitNum
		}
	];

	const videos = await Video.aggregate(pipeline);

	return res
		.status(200)
		.json(new ApiResponse(200, videos, "Videos fetched successfully"));
}); 

export { publishAVideo, getAllVideos, getVideoById, updateAVideo, deleteAVideo, togglePublishStatus, searchVideos };