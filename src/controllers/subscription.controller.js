import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Subscription } from "../models/subscription.model.js";
import mongoose, { isValidObjectId, Types } from "mongoose";

const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params;

    if (!isValidObjectId(channelId)) {
        throw new ApiError("Invalid channel ID", 400);
    }

    const isSubscribed = await Subscription.findOne({
        subscriber: req.user?._id,
        channel: channelId 
    });

    if (isSubscribed) {
        await Subscription.deleteOne({ _id: isSubscribed?._id });
        return res
        .status(200)
        .json(new ApiResponse(200, { Subscribed: false }, "Unsubscribed successfully"));
    } else {
        await Subscription.create({
            subscriber: req.user?._id,
            channel: channelId
        });
        return res
        .status(200)
        .json(new ApiResponse(200, { Subscribed: true }, "Subscribed successfully"));
    }
});

const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const { channelId } = req.params;

    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channelId");
    }

    const objectChannelId = new mongoose.Types.ObjectId(channelId);

    const subscribers = await Subscription.aggregate([
        {
            $match: { channel: objectChannelId },
        },
        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscriber",
                pipeline: [
                    {
                        $lookup: {
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "channel",
                            as: "subscribedToSubscriber",
                        },
                    },
                    {
                        $addFields: {
                            // Check if the current channel is also subscribed to this subscriber
                            subscribedToSubscriber: {
                                $cond: {
                                    if: {
                                        $in: [
                                            objectChannelId,
                                            "$subscribedToSubscriber.subscriber",
                                        ],
                                    },
                                    then: true,
                                    else: false,
                                },
                            },
                            // Count how many subscribers this user (the subscriber) has
                            subscribersCount: {
                                $size: "$subscribedToSubscriber",
                            },
                        },
                    },
                    {
                        $project: {
                            _id: 1,
                            username: 1,
                            fullName: 1,
                            "avatar.url": 1,
                            subscribedToSubscriber: 1,
                            subscribersCount: 1,
                        },
                    },
                ],
            },
        },
        { $unwind: "$subscriber" },
        {
            $replaceRoot: { newRoot: "$subscriber" }, // makes the output cleaner
        },
    ]);

    const totalSubscribers = subscribers.length;

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                totalSubscribers,
                subscribers,
            },
            "Subscribers fetched successfully"
        )
    );
});

// Get subscription list just like YouTube (The channels you(user) have subscribed to)
const getSubscriptionList = asyncHandler(async (req, res) => {
    // The current user is the one whose subscriptions we want to fetch.
    const userId = req.user?._id;

    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user ID");
    }

    const objectUserId = new mongoose.Types.ObjectId(userId);

    const subscribedChannels = await Subscription.aggregate([
        // Stage 1: Match all subscriptions where the subscriber is the current user (userId)
        {
            $match: {
                subscriber: objectUserId,
            },
        },
        // Stage 2: Join with the 'users' collection to get the channel details
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "subscribedChannel",
                pipeline: [
                    // Inner Pipeline on the 'subscribedChannel' (User) document:
                    // Stage 2.1: Lookup the subscriptions collection again to count the channel's subscribers
                    {
                        $lookup: {
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "channel",
                            as: "subscribers",
                        },
                    },
                    // Stage 2.2: Add fields to the channel document
                    {
                        $addFields: {
                            // Count of users subscribed to this channel
                            subscriberCount: {
                                $size: "$subscribers",
                            },
                            // Check if the current user (subscriber) is subscribed to this channel (which is true, as per the outer $match)
                            // This field is kept for consistency with the other controllers, but will always be true
                            isSubscribed: {
                                $cond: {
                                    if: { $in: [objectUserId, "$subscribers.subscriber"] },
                                    then: true,
                                    else: false,
                                },
                            },
                        },
                    },
                    // Stage 2.3: Project only the required fields from the channel (user) document
                    {
                        $project: {
                            _id: 1,
                            username: 1,
                            fullName: 1,
                            "avatar.url": 1,
                            subscriberCount: 1,
                            isSubscribed: 1,
                        },
                    },
                ],
            },
        },
        // Stage 3: Deconstruct the 'subscribedChannel' array field, which will have one element
        {
            $unwind: "$subscribedChannel",
        },
        // Stage 4: Replace the root document with the unwound 'subscribedChannel' document
        // This gives a clean array of channel objects as the final result
        {
            $replaceRoot: {
                newRoot: "$subscribedChannel",
            },
        },
    ]);

    const totalChannels = subscribedChannels.length;

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                totalChannels,
                subscribedChannels,
            },
            "Subscribed channels fetched successfully"
        )
    );
});
export { toggleSubscription, getUserChannelSubscribers, getSubscriptionList };