import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import validator from "validator";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessTokenAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating access and refresh token");
    }
}

const registerUser = asyncHandler(async (req, res) => {
    // get user details from frontend
    // validation of user details
    // check if user already exists : username, email
    // check for images and avatar
    // uploade them to cloudinary : avatar
    // create user object - create entry in db
    // remove password and refreshToken from response
    // check for user creation
    // return response

    const { username, email, fullName, password } = req.body;  

    // Empty fields check
    if(
        [username, email, fullName, password].some((field) => 
            field?.trim() === ""
        )
    ){
        throw new ApiError(400, "All fields are required");
    }

    // Email format check
    if (!validator.isEmail(email)) {  
        throw new ApiError(400, "Invalid email format");
    }
    
    // Password length check
    if (password.length < 6) {
        throw new ApiError(400, "Password must be at least 6 characters long");
    }

    // Check if user already exists
    const existedUser = await User.findOne({ 
        $or: [
            { username },
            { email }
        ]
     });
    if (existedUser) {
        throw new ApiError(409, "User already exists");
    }

    // Getting local path of avatar and coverImage
    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path;  

    if(!avatarLocalPath) {
        throw new ApiError(400, "Avatar is required");
    }

    // Upload images to cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!avatar) {
        throw new ApiError(500, "Error uploading images to cloudinary");
    }

    // Create user object
    const user = await User.create({
        username: username.toLowerCase(),
        email,
        fullName,
        password,
        avatar: {
            url: avatar.url,
            public_id: avatar.public_id
        },
        coverImage: coverImage ? {
            url: coverImage.url,
            public_id: coverImage.public_id
        } : {}
    });

    // Remove password and refreshToken from response
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    if(!createdUser) {
        throw new ApiError(500, "Error while registering user");
    }

    return res.status(201).json(
        new ApiResponse(201, createdUser, "User registered successfully")
    );
});

const loginUser = asyncHandler(async (req, res) => {
    // req body --> data
    // check if username or email exists
    // find the user
    // check if password is correct
    // create accessToken and refreshToken
    // send cookies

    const { email, password } = req.body;

    // Email check
    if(!email) {
        throw new ApiError(400, "Email is required");
    }

    // find the user using email
    const user = await User.findOne({ email });

    if (!user) {
        throw new ApiError(404, "User does not exist");
    }

    // check if password is correct
    const isPasswordCorrect = await user.isPasswordCorrect(password);

    if (!isPasswordCorrect) {
        throw new ApiError(401, "Incorrect password");
    }

    // create accessToken and refreshToken
    const { accessToken, refreshToken } = await generateAccessTokenAndRefreshToken(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser,
                accessToken,
                refreshToken
            },
            "User logged in successfully"
        )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
    
    await User.findByIdAndUpdate(
        req.user._id, 
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    );

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, null, "User logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies?.refreshToken || req.body.refreshToken;

    if(!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized request");
    }

    const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);

    const user = await User.findById(decodedToken?._id);

    if(!user) {
        throw new ApiError(401, "Invalid Refresh Token");
    }

    if(user?.refreshToken !== incomingRefreshToken) {
        throw new ApiError(401, "Refresh Token is expired");
    }

    const { accessToken, newRefreshToken } = await  generateAccessTokenAndRefreshToken(user._id);

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", newRefreshToken, options)
    .json(
        new ApiResponse(
            200,
            {
                accessToken,
                refreshToken : newRefreshToken
            },
            "New Access token generated successfully"
        )
    );
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword, confirmPassword } = req.body;

    const user = await User.findById(req.user?._id);

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if(!isPasswordCorrect) {
        throw new ApiError(401, "Incorrect old password");
    }

    user.password = newPassword;

    if(newPassword !== confirmPassword) {
        throw new ApiError(400, "New password and confirm password do not match");
    }

    await user.save({ validateBeforeSave: false });

    return res
    .status(200)
    .json(new ApiResponse(200, null, "Password changed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
    return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current User found successfully"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { username, email, fullName } = req.body;

    // Find current user first
    const currentUser = await User.findById(userId);
    if (!currentUser) {
        throw new ApiError(404, "User not found");
    }

    // Prepare update object
    const updateData = {};

    // Username
    if (username) {
        const existingUser = await User.findOne({ username, _id: { $ne: userId } });
        if (existingUser) {
            throw new ApiError(400, "Username already taken");
        }
        updateData.username = username.toLowerCase();
    }

    // Email
    if (email) {
        if (!validator.isEmail(email)) {
            throw new ApiError(400, "Invalid email format");
        }
        const existingEmail = await User.findOne({ email, _id: { $ne: userId } });
        if (existingEmail) {
            throw new ApiError(400, "Email already in use");
        }
        updateData.email = email;
    }

    // Full Name
    if (fullName) {
        updateData.fullName = fullName;
    }

    // Avatar & CoverImage (from files)
    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

    if (avatarLocalPath) {
        // Delete old avatar
        if (currentUser.avatar?.public_id) {
            await deleteFromCloudinary(currentUser.avatar.public_id);
        }
        // Upload new one
        const avatar = await uploadOnCloudinary(avatarLocalPath);
        if (!avatar) throw new ApiError(500, "Error uploading avatar");
        updateData.avatar = { url: avatar.secure_url, public_id: avatar.public_id };
    }

    if (coverImageLocalPath) {
        // Delete old cover
        if (currentUser.coverImage?.public_id) {
            await deleteFromCloudinary(currentUser.coverImage.public_id);
        }
        // Upload new one
        const coverImage = await uploadOnCloudinary(coverImageLocalPath);
        if (!coverImage) throw new ApiError(500, "Error uploading cover image");
        updateData.coverImage = { url: coverImage.secure_url, public_id: coverImage.public_id };
    }

    // Check if user actually sent something
    if (Object.keys(updateData).length === 0) {
        throw new ApiError(400, "No fields to update");
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $set: updateData },
        { new: true }
    ).select("-password -refreshToken");

    if (!updatedUser) {
        throw new ApiError(404, "User not found");
    } 

    return res.status(200).json(
        new ApiResponse(200, updatedUser, "Account updated successfully")
    );
});

const deleteAccount = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Delete avatar
  if (user.avatar?.public_id) {
    await deleteFromCloudinary(user.avatar.public_id);
  }

  // Delete cover image
  if (user.coverImage?.public_id) {
    await deleteFromCloudinary(user.coverImage.public_id);
  }

  // Finally delete the user record
  await User.findByIdAndDelete(req.user._id);

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Account deleted successfully"));
});


export { 
    registerUser,
    loginUser, 
    logoutUser, 
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    deleteAccount
}; 