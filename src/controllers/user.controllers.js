import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResonse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";


const generateAccessAndRefreshTokens = async(userId) => {
    try {
        
        const user = await User.findById(userId)
        
        const accessToken = user.generateAccessToken()
        //console.log(accessToken)

        const refreshToken = user.generateRefreshToken()
        //console.log(refreshToken)
        

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})

        return {accessToken, refreshToken}

    } catch (error) {

        throw new ApiError(500, "somethig went wrong while generating refresh and access tokens")

    }
}

const registerUser = asyncHandler(async (req, res) => 
    {
        // get user details from frontend
        // validation - not empty
        // check if user already exists - username, email
        // check for images - avatar, cover image
        // upload them to cloudinary
        // create user object
        // create entry in db
        // remove password and refreshtoken fields from response
        // check for user creation
        // send response

        const {fullName, email, username, password} = req.body

      //  if (fullName === ""){
      //      throw new ApiError(400, "fullName is required");
      //  }  
      
        if (
            [fullName, email, username, password].some((field) => 
                field?.trim() === ""
            )
        ){
            throw new ApiError(400, "All fields are required")
        }
        
        const existingUser = await User.findOne({
            $or: [{username}, {email}]
        })

        if (existingUser){
            throw new ApiError(409, "User with email or username already exists")
        }

        //console.log("beyond existing user")

        const avatarLocalPath = req.files?.avatar[0]?.path;
     //   const coverImageLocalPath = req.files?.coverImage[0]?.path;

        let coverImageLocalPath;

        if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
            coverImageLocalPath = req.files.coverImage[0].path
        }
        

        if (!avatarLocalPath){
            throw new ApiError(400, "Avatar file is requied")
        }

        
        const avatar = await uploadOnCloudinary(avatarLocalPath)
       // console.log(avatar)

        const coverImage = await uploadOnCloudinary(coverImageLocalPath)

        if (!avatar){
            throw new ApiError(400, "Avatar file is requied")
        }

        const user = await User.create({
            fullName,
            avatar: avatar.url,
            coverImage: coverImage?.url || "",
            email,
            password,
            username: username.toLowerCase()
        })

        const createdUser = await User.findById(user._id).select(
            "-password -refreshToken"
        )

        if (!createdUser){
            throw new ApiError(500, "Something went wrong while registering the user")
        }
        

        return res.status(201).json(
            new ApiResponse(200, createdUser, "User registered successfully")
        )

       // console.log(`email: ${email}`)
    }
    
)


const loginUser = asyncHandler(async (req, res) => {
    // req.body -> data from frontend
    // username or email & password -> required field(s) for login
    // find the username in users table in mongodb
    // password check
    // access and refresh tokens
    // send cookie

    const {username, email, password} = req.body

    console.log(req.body)

    if (!username || !email){
        throw new ApiError(400, "Username and email both are required")
    }
        

    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    if (!user){
        throw new ApiError(404, "user not found")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid){
        throw new ApiError(401, "Invalid user credentials")
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id)
    .select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(new ApiResponse(200, {user: loggedInUser, accessToken, refreshToken}, "User logged in successfully!"))

})


const logoutUser = asyncHandler(async (req,res) => {

    User.findByIdAndUpdate(req.user._id,
        {
            $unset: {
                refreshToken: 1
            },     
        },

        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged out"))

})


const refreshAccessToken = asyncHandler(async (req, res) => {
    const IncomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!IncomingRefreshToken){
        throw new ApiError(401, "unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(
            IncomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
    
        const user = await User.findById(decodedToken?._id)
    
        if (!user){
            throw new ApiError(401, "Invalid refresh token")
        }
    
        if (IncomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "refresh token is expired or used") 
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {accessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user._id)
    
        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    {accessToken, refreshToken: newRefreshToken},
                    "Access token refreshed successfully"
                )
            )
    } catch (error) {
        throw new ApiError(401, "problem at refreshAccessToken in user.controllers")
    }

})


const changeCurrentPassword = asyncHandler(async (req, res) => {
    const {oldPassword, newPassword} = req.body

    const user = await User.findById(req.user?._id)
    const isPasswordValid = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordValid){
        throw new ApiError(400, "Incorrect old password")
    }

    try {
        user.password = newPassword
        await user.save({validateBeforeSave: false})
    
        return res
            .status(200)
            .json(new ApiResponse(200, {}, "Password changed successfully"))

    } catch (error) {
        throw new ApiError(500, "problem at change current password method")
    }
})


const getCurrentUser = asyncHandler(async (req, res) => {
    try {
        return res
            .status(200)
            .json(new ApiResponse(200, req.user, "current user fetched successfully"))

    } catch (error) {
        throw new ApiError(500, "problem at get current user method")
    }
})

const updateAccountDetails = asyncHandler(async (req, res) => {
    const {fullName, email} = req.body

    if (!fullName || !email){
        throw new ApiError(400, "all fields are required")
    }

    const user = User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                fullName,
                email
            }
        },
        {new: true}
    ).select("-password")

    return res
        .status(200)
        .json(new ApiResponse(200, user, "account details updated successfully"))
})


const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.files?.path

    if (!avatarLocalPath){
        throw new ApiError(400, "avatar file is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if (!avatar.url){
        throw new ApiError(400, "problem at update user avatar method")
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                avatar: avatar.url
            }
        },

        {new: true}

    ).select("-password")

    return res
        .status(200)
        .json(new ApiResponse(200, user, "avatar updated successfully"))

})


const updateUserCoverImage = asyncHandler(async (req, res) => {
    const CoverImageLocalPath = req.files?.path

    if (!CoverImageLocalPath){
        throw new ApiError(400, "cover image file is missing")
    }

    const coverImage = await uploadOnCloudinary(CoverImageLocalPath)

    if (!coverImage.url){
        throw new ApiError(400, "problem at update user cover image method")
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },

        {new: true}

    ).select("-password")

    return res
        .status(200)
        .json(new ApiResponse(200, user, "cover image updated successfully"))

})


const getUserChannelProfile = asyncHandler(async (req, res) => {
    const {username} = req.params

    if (!username?.trim()) {
        throw new ApiError(400, "username is missing")
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },

        {
            $lookup: {
                from: "subsriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },

        {
            $lookup: {
                from: "subsriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },

        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },

                channelsSubscribedToCount: {
                    $size: "$subscribedTo"
                },

                isSubscribed: {
                    $cond: {
                        if: {$in: [req.user?._id, "subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }  
        },

        {
            $project: {
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1
            }
        }
    ]);

    if (!channel?.length) {
        throw new ApiError(404, "Channel does not exist")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, channel[0], "User channel fetched successfully"))
})


const getWatchHistory = asyncHandler(async (req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },

        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1,
                                    }
                                }
                            ]
                        }
                    },

                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                user[0].watchHistory,
                "Watch history fetched successfully"
            )
        )
})


export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
}