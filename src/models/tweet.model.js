import mongoose, { Schema } from "mongoose";

const tweetSchema = new Schema({
    content: {
        type: String,
        required: true,
        trim: true,
        maxlength: 500, // prevents super long spammy tweets
    },
    owner: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
}, { timestamps: true });

export const Tweet = mongoose.model("Like", tweetSchema);