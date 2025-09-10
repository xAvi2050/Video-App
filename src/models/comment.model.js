import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const commentSchema = new Schema(
    {
        content: {
            type: String,
            required: true,
            trim: true,
            maxlength: 500, // prevents super long spammy comments
        },
        video: {
            type: Schema.Types.ObjectId,
            ref: "Video",
            required: true,
        },
        owner: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        parentComment: {
            type: Schema.Types.ObjectId,
            ref: "Comment",
            default: null, // null => top-level comment, not a reply
        },
    },
    { timestamps: true }
);

// Indexes for performance
commentSchema.index({ video: 1 });
commentSchema.index({ owner: 1 });
commentSchema.index({ parentComment: 1 });

// Add pagination support
commentSchema.plugin(mongooseAggregatePaginate);

export const Comment = mongoose.model("Comment", commentSchema);