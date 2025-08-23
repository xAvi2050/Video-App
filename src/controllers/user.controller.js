import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import validator from "validator";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

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
        avatar: avatar.url,
        coverImage: coverImage?.url || "" 
    })

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

export { registerUser };