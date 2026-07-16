import { User } from "../models/user.model.js";
import { Portfolio } from "../models/portfolio.model.js";
import { Watchlist } from "../models/watchlist.model.js";
import { Alert } from "../models/alert.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";
import jwt from 'jsonwebtoken'; // import jwt for refresh token verification

// helper function to generate both access and refresh tokens for a user
const generateTokens = async (userId) => {
    const user = await User.findById(userId).select("+refreshToken");
    const accessToken = user.generateAccessToken(); // generate short lived access token
    const refreshToken = user.generateRefreshToken(); // generate long lived refresh token
    user.refreshToken = refreshToken; // save refresh token to database
    await user.save({ validateBeforeSave: false }); // save without running validations
    return { accessToken, refreshToken }; // return both tokens
};

// cookie options — httpOnly prevents javascript from accessing the cookie
const cookieOptions = {
    httpOnly: true, // cookie cannot be accessed by javascript — prevents XSS attacks
    secure: process.env.NODE_ENV === 'production', // only send cookie over https in production
    sameSite: 'strict', // cookie only sent for same site requests — prevents CSRF attacks
};

// ─── register ────────────────────────────────────────────────────────────────

export const registerUser = asyncHandler(async (req, res) => {

    // step 1 — get data from request body
    const { name, email, username, password } = req.body;

    // step 2 — check all fields are provided
    if ([name, email, username, password].some((field) => field?.trim() === '')) {
        throw new ApiError(400, 'All fields are required'); // throw error if any field is empty
    }

    // step 3 — check if user already exists with same email or username
    const existingUser = await User.findOne({
        $or: [
            { email: email?.trim().toLowerCase() },
            { username: username?.trim().toLowerCase() },
        ],
    });

    if (existingUser) {
        throw new ApiError(409, 'User with this email or username already exists');
    }

    // step 4 — check if avatar file was uploaded
    const avatarLocalPath = req.file?.path; // get temp path of uploaded avatar from multer

    let avatar = null; // default avatar to null

    if (avatarLocalPath) {
        avatar = await uploadOnCloudinary(avatarLocalPath); // upload avatar to cloudinary
        if (!avatar) {
            throw new ApiError(500, 'Error uploading avatar — please try again');
        }
    }

    // step 5 — create the user in database
    const user = await User.create({
        name, // user's full name
        email, // user's email
        username: username.toLowerCase(), // store username in lowercase
        password, // password will be hashed automatically by pre save hook
        avatar: avatar?.secure_url || '', // cloudinary url or empty string if no avatar
        avatarPublicId: avatar?.public_id || '', // cloudinary public id for deletion later
    });

    // step 6 — create an empty portfolio for the new user automatically
    await Portfolio.create({
        userId: user._id, // link portfolio to the new user
        name: 'My Portfolio', // default portfolio name
        description: '', // empty description
        holdings: [], // empty holdings array
    });

    // step 7 — fetch the created user without password and refreshToken
    const createdUser = await User.findById(user._id);
    // toJSON method removes password and refreshToken automatically

    if (!createdUser) {
        throw new ApiError(500, 'Something went wrong while creating the user');
    }

    // step 8 — send success response
    return res.status(201).json(
        new ApiResponse(201, createdUser, 'User registered successfully')
    );
});

// ─── login ────────────────────────────────────────────────────────────────────

export const loginUser = asyncHandler(async (req, res) => {

    // step 1 — get data from request body
    const { email, username, password } = req.body;

    // step 2 — check email or username is provided
    if (!email && !username) {
        throw new ApiError(400, 'Email or username is required');
    }

    // step 3 — check password is provided
    if (!password) {
        throw new ApiError(400, 'Password is required');
    }

    // step 4 — find user by email or username
    const conditions = [];
    if (email) conditions.push({ email: email.trim().toLowerCase() });
    if (username) conditions.push({ username: username.trim().toLowerCase() });

    const user = await User.findOne({
        $or: conditions,
    }).select("+password");

    if (!user) {
        throw new ApiError(404, 'User not found — please register first');
    }

    // step 5 — check if account is active
    if (!user.isActive) {
        throw new ApiError(403, 'Your account has been deactivated — contact support');
    }

    // step 6 — verify the password
    const isPasswordValid = await user.isPasswordCorrect(password);
    // isPasswordCorrect is defined in User model — compares entered password with hash

    if (!isPasswordValid) {
        throw new ApiError(401, 'Invalid credentials — incorrect password');
    }

    // step 7 — generate access and refresh tokens
    const { accessToken, refreshToken } = await generateTokens(user._id);

    // step 8 — fetch logged in user without password and refreshToken
    const loggedInUser = await User.findById(user._id);

    // step 9 — send tokens in cookies and response
    return res
        .status(200)
        .cookie('accessToken', accessToken, cookieOptions) // set access token in cookie
        .cookie('refreshToken', refreshToken, cookieOptions) // set refresh token in cookie
        .json(
            new ApiResponse(200, {
                user: loggedInUser, // send user data
                accessToken, // also send access token in body — useful for mobile apps
                refreshToken, // also send refresh token in body — useful for mobile apps
            },
            'User logged in successfully'
        )
    );
});

// ─── logout ───────────────────────────────────────────────────────────────────

export const logoutUser = asyncHandler(async (req, res) => {

    // step 1 — remove refresh token from database
    await User.findByIdAndUpdate(
        req.user._id, // get user id from req.user — attached by verifyJWT middleware
        {
            $unset: { refreshToken: 1 }, // remove refreshToken field from document
        },
        { new: true } // return updated document
    );

    // step 2 — clear both cookies
    return res
        .status(200)
        .clearCookie('accessToken', cookieOptions) // clear access token cookie
        .clearCookie('refreshToken', cookieOptions) // clear refresh token cookie
        .json(new ApiResponse(200, {}, 'User logged out successfully'));
});

// ─── refresh access token ─────────────────────────────────────────────────────

export const refreshAccessToken = asyncHandler(async (req, res) => {

    // step 1 — get refresh token from cookies or request body
    const incomingRefreshToken =
        req.cookies?.refreshToken || req.body?.refreshToken;
    // check cookies first — then body for mobile apps

    if (!incomingRefreshToken) {
        throw new ApiError(401, 'Unauthorized — no refresh token provided');
    }

    // step 2 — verify the refresh token
    let decodedToken;
    try {
        decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
        // verify using refresh token secret — different from access token secret
    } catch (err) {
        throw new ApiError(401, 'Unauthorized — invalid or expired refresh token');
    }

    // step 3 — find user from decoded token
    const user = await User.findById(decodedToken?._id).select("+refreshToken");

    if (!user) {
        throw new ApiError(401, 'Unauthorized — user not found');
    }

    if (incomingRefreshToken !== user.refreshToken) {
        throw new ApiError(401, 'Unauthorized — refresh token is expired or already used');
        // this handles the case where someone tries to reuse an old refresh token
    }

    // step 5 — generate new tokens
    const { accessToken, refreshToken } = await generateTokens(user._id);

    // step 6 — send new tokens
    return res
        .status(200)
        .cookie('accessToken', accessToken, cookieOptions) // set new access token cookie
        .cookie('refreshToken', refreshToken, cookieOptions) // set new refresh token cookie
        .json(
            new ApiResponse(200, { accessToken, refreshToken }, 'Access token refreshed successfully')
        );
});

// ─── get current user ─────────────────────────────────────────────────────────

export const getCurrentUser = asyncHandler(async (req, res) => {
    // req.user is already attached by verifyJWT middleware — no database call needed
    return res.status(200).json(
        new ApiResponse(200, req.user, 'Current user fetched successfully')
    );
});

// ─── update account details ───────────────────────────────────────────────────

export const updateAccountDetails = asyncHandler(async (req, res) => {

    // step 1 — get fields to update from request body
    const { name, email } = req.body;

    // step 2 — check at least one field is provided
    if (!name && !email) {
        throw new ApiError(400, 'At least one field is required to update');
    }

    // step 3 — build update object with only provided fields
    const updateFields = {};
    if (name)  updateFields.name  = name; // only update name if provided
    if (email) updateFields.email = email; // only update email if provided

    // step 4 — check if new email is already taken by another user
    if (email) {
        const emailExists = await User.findOne({ email, _id: { $ne: req.user._id } });
        // $ne means 'not equal' — exclude the current user from the check
        if (emailExists) {
            throw new ApiError(409, 'Email is already taken by another user');
        }
    }

    // step 5 — update user in database
    const updatedUser = await User.findByIdAndUpdate(
        req.user._id, // find user by id from req.user
        { $set: updateFields }, // only update the provided fields
        { new: true } // return the updated document
    );

    return res.status(200).json(
        new ApiResponse(200, updatedUser, 'Account details updated successfully')
    );
});

// ─── update avatar ────────────────────────────────────────────────────────────

export const updateAvatar = asyncHandler(async (req, res) => {

    // step 1 — get temp path of uploaded avatar from multer
    const avatarLocalPath = req.file?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, 'Avatar file is required');
    }

    // step 2 — delete old avatar from cloudinary if it exists
    if (req.user?.avatarPublicId) {
        await deleteFromCloudinary(req.user.avatarPublicId);
        // delete old avatar to avoid unused files piling up in cloudinary
    }

    // step 3 — upload new avatar to cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if (!avatar?.secure_url) {
        throw new ApiError(500, 'Error uploading avatar — please try again');
    }

    // step 4 — update user avatar url and public id in database
    const updatedUser = await User.findByIdAndUpdate(
        req.user._id, // find user by id
        {
            $set: {
                avatar: avatar.secure_url, // new cloudinary url
                avatarPublicId: avatar.public_id, // new cloudinary public id
            },
        },
        { new: true } // return updated document
    );

    return res.status(200).json(
        new ApiResponse(200, updatedUser, 'Avatar updated successfully')
    );
});

// ─── change password ──────────────────────────────────────────────────────────

export const changePassword = asyncHandler(async (req, res) => {

    // step 1 — get old and new password from request body
    const { oldPassword, newPassword } = req.body;

    // step 2 — check both fields are provided
    if (!oldPassword || !newPassword) {
        throw new ApiError(400, 'Old password and new password are required');
    }

    // step 3 — find user by id — need full document including password
    const user = await User.findById(req.user._id).select("+password");

    // step 4 — verify old password is correct
    const isOldPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if (!isOldPasswordCorrect) {
        throw new ApiError(401, 'Old password is incorrect');
    }

    // step 5 — check new password is different from old password
    if (oldPassword === newPassword) {
        throw new ApiError(400, 'New password cannot be the same as old password');
    }

    // step 6 — set new password — pre save hook will hash it automatically
    user.password = newPassword;
    await user.save({ validateBeforeSave: false }); // save — pre save hook runs and hashes the password

    return res.status(200).json(
        new ApiResponse(200, {}, 'Password changed successfully')
    );
});

// ─── delete account ───────────────────────────────────────────────────────────

export const deleteAccount = asyncHandler(async (req, res) => {

    // step 1 — delete avatar from cloudinary if it exists
    if (req.user?.avatarPublicId) {
        await deleteFromCloudinary(req.user.avatarPublicId);
    }

    await Portfolio.findOneAndDelete({ userId: req.user._id });
    await Watchlist.deleteMany({ userId: req.user._id });
    await Alert.deleteMany({ userId: req.user._id });

    // step 3 — delete the user from database
    await User.findByIdAndDelete(req.user._id);

    // step 4 — clear cookies
    return res
        .status(200)
        .clearCookie('accessToken', cookieOptions) // clear access token cookie
        .clearCookie('refreshToken', cookieOptions) // clear refresh token cookie
        .json(new ApiResponse(200, {}, 'Account deleted successfully'));
});