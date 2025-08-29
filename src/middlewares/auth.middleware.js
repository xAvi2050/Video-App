import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

export const verifyJWT = asyncHandler(async (req, res, next) => {
    const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")

    if(!token) {
        throw new ApiError(401, "Unauthorized request");
    }

    // Checks whether the token was signed with my ACCESS_TOKEN_SECRET
    // If the token was tampered with or signed using some other secret, jwt.verify() will throw an error
    // If the token is valid, it returns the payload inside the decodedToken (_id, username, email, fullName)
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const user = await User.findById(decodedToken?._id).select("-password -refreshToken");

    if(!user) {
        throw new ApiError(401, "Invalid Access Token");
    }

    req.user = user;
    
    next();
});