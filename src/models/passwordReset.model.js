import mongoose, { Schema } from "mongoose";

const passwordResetSchema = new Schema(
    {
        user: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: "User", 
            required: true 
        },
        otp: { 
            type: String, 
            required: true 
        },
        createdAt: { 
            type: Date, 
            default: Date.now, 
            expires: 300 // expires after 5 mins
        } 
    }
);

export const PasswordReset = mongoose.model("PasswordReset", passwordResetSchema);