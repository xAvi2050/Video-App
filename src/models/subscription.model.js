import mongoose, { Schema } from "mongoose";
import { ApiError } from "../utils/ApiError.js";

const subscriptionSchema = new Schema({
    subscriber: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    channel: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    }
}, { timestamps: true });

// Prevent duplicate subscriptions
subscriptionSchema.index({ subscriber: 1, channel: 1 }, { unique: true });

// Prevent self-subscriptions
subscriptionSchema.pre("save", async function (next) {
    if (this.subscriber.toString() === this.channel.toString()) {
        throw new ApiError("You cannot subscribe to yourself");
    }
    next();
});

export const Subscription = mongoose.model("Subscription", subscriptionSchema);