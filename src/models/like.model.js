import mongoose, { Schema } from "mongoose";

const likeSchema = new Schema({
    video: {
        type: Schema.Types.ObjectId,
        ref: "Video",
        default: null
    },
    comment: {
        type: Schema.Types.ObjectId,
        ref: "Comment",
        default: null
    },
    tweet: {
        type: Schema.Types.ObjectId,
        ref: "Tweet",
        default: null
    },
    likedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    }
}, { timestamps: true });

// 🔒 Validation: Ensure at least one of video/comment/tweet exists
likeSchema.pre("save", function (next) {
  if (!this.video && !this.comment && !this.tweet) {
    return next(new Error("Like must be associated with a video, comment, or tweet"));
  }
  next();
});

export const Like = mongoose.model("Like", likeSchema);