import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { PasswordReset } from "../models/passwordReset.model.js";
import { sendEmail } from "../utils/sendEmail.js";

// Send OTP to email
const sendResetOTP = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) throw new ApiError(400, "Email is required");

  const user = await User.findOne({ email });
  if (!user) throw new ApiError(404, "User not found");

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // delete previous OTPs for that user
  await PasswordReset.deleteMany({ user: user._id });

  await PasswordReset.create({ user: user._id, otp });

  await sendEmail(
    email,
    "Password Reset OTP",
    `Your OTP for password reset is ${otp}. It expires in 5 minutes.`
  );

  return res.status(200).json(new ApiResponse(200, null, "OTP sent to registered email"));
});

// Verify OTP and reset password
const resetPassword = asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    throw new ApiError(400, "Email, OTP and new password are required");
  }

  const user = await User.findOne({ email });
  if (!user) throw new ApiError(404, "User not found");

  const record = await PasswordReset.findOne({ user: user._id, otp });
  if (!record) throw new ApiError(400, "Invalid or expired OTP");

  user.password = newPassword;
  await user.save();

  // delete all OTPs after successful reset
  await PasswordReset.deleteMany({ user: user._id });

  return res.status(200).json(new ApiResponse(200, null, "Password reset successful"));
});

export { sendResetOTP, resetPassword };