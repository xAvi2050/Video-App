import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Video } from "../models/video.model.js";
import { Playlist } from "../models/playlist.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose, { isValidObjectId } from "mongoose";

// Create a new playlist
const createPlaylist = asyncHandler(async (req, res) => {
    const { name, description } = req.body; 

    if (!name) {
        throw new ApiError(400, "Playlist name is required");
    }

    const playlist = await Playlist.create({
        name,
        description: description || "No description provided",
        owner: req.user?._id
    });

    if (!playlist) {
        throw new ApiError(500, "Failed to create playlist");
    }

    return res
        .status(201)
        .json(new ApiResponse(201, playlist, "Playlist created successfully"));
});

// Update a playlist
const updatePlaylist = asyncHandler(async (req, res) => {
    const { name, description } = req.body;
    const { playlistId } = req.params; 

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlistId");
    }

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
        throw new ApiError(404, "Playlist not found");
    }

    if (playlist?.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to update this playlist");
    }

    const updateData = {};
    if(name !== undefined) updateData.name = name;
    if(description !== undefined) updateData.description = description;

    if (Object.keys(updateData).length === 0) {
        return res
            .status(200)
            .json(new ApiResponse(200, playlist, "No changes made to the playlist"));
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlist?._id,
        { $set: updateData },
        { new: true} // the function returns the updated document after the modification, not the original one before the update
    );

    return res
        .status(200)
        .json(new ApiResponse(200, updatedPlaylist, "Playlist updated successfully"));
});

// Delete a playlist
const deletePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlistId");
    }

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
        throw new ApiError(404, "Playlist not found");
    }

    if (playlist?.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to delete this playlist");
    }

    await Playlist.findByIdAndDelete(playlist?._id);

    return res
        .status(200)
        .json(new ApiResponse(200, null, "Playlist deleted successfully"));
});

// Add videos to a playlist
const addVideosToPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlistId");
    }

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId");
    }

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
        throw new ApiError(404, "Playlist not found");
    }

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    if (playlist.owner?.toString() && video.owner?.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to add videos to this playlist");
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlist?._id,
        { 
            $addToSet: { 
                videos: video._id 
            } 
        }, // addToSet ensures no duplicates (if the video is already in the playlist, it won't be added again)
        { new: true }
    ).populate("videos");

    if (!updatedPlaylist) {
        throw new ApiError(500, "Failed to add video to playlist");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, updatedPlaylist, "Video added to playlist successfully"));
});

// Remove videos from a playlist
const removeVideosFromPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlistId");
    }

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId");
    } 

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
        throw new ApiError(404, "Playlist not found");
    }

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    if (playlist.owner?.toString() && video.owner?.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to remove videos from this playlist");
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlist?._id,
        { $pull: { videos: video._id } },
        { new: true }
    );

    if (!updatedPlaylist) {
        throw new ApiError(500, "Failed to remove video from playlist");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, updatedPlaylist, "Video removed from playlist successfully"));
});

// Get a single playlist of a user
const getPlaylistById = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlistId");
    }

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
        throw new ApiError(404, "Playlist not found");
    }

    const playlistVideos = await Playlist.aggregate([
        {
            // converts the playlistId string into a MongoDB ObjectId type, which is required when querying by _id
            $match: { _id: new mongoose.Types.ObjectId(playlistId) }
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos"
            }
        },
        {
            $match: {"videos.isPublished": true}
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails"
            }
        },
        {
            $addFields: {
                totalVideos: { $size: "$videos" },
                ownerDetails: { $arrayElemAt: ["$ownerDetails", 0] } // Get the first element of the ownerDetails array
            }
        },
        {
            $project: {
                name: 1,
                description: 1,
                totalVideos: 1,
                createdAt: 1,
                updatedAt: 1,
                videos: {
                    _id: 1,
                    "videoFile.url": 1,
                    duration: 1,
                    "thumbnail.url": 1,
                    title: 1,
                    description: 1,
                    views: 1,
                    createdAt: 1
                },
                ownerDetails: {
                    _id: 1,
                    username: 1,
                    fullName: 1,
                    "avatar.url": 1   
                }
            }
        }
    ]);

    return res
        .status(200)
        .json(new ApiResponse(200, playlistVideos[0], "Playlist fetched successfully"));
});

// Get all playlists of a user
const getAllPlaylistsOfUser = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid userId");
    }

    const playlists = await Playlist.find({ owner: userId })
        .select("name description createdAt updatedAt")
        .sort({ createdAt: -1 });

    return res
        .status(200)
        .json(new ApiResponse(200, playlists, "Playlists fetched successfully"));
});

export { createPlaylist, updatePlaylist, deletePlaylist, addVideosToPlaylist, removeVideosFromPlaylist, getPlaylistById, getAllPlaylistsOfUser };