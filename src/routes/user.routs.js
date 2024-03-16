import { Router } from "express";

import 

    { 

        loginUser,
        logoutUser,
        registerUser,
        refreshAccessToken,
        changeCurrentPassword,
        getCurrentUser,
        updateAccountDetails, 
        updateUserAvatar,
        updateUserCoverImage,
        getUserChannelProfile, 
        getWatchHistory 

    } 

from "../controllers/user.controllers.js";

import { upload } from "../middlewares/multer.middlewares.js";

import { verifyJWT } from "../middlewares/auth.middleware.js";

//import { verify } from "jsonwebtoken";


const userRouter = Router()

userRouter.route("/register").post(
   
    // error in tutorial; 
    // image files get saved to public/temp before registerUser is run;
    // the uploadOnCloudinary function is run in registerUser while the files are uploaded to local storage beforehand;
    // this causes the files to stay in temp in case the user data is invalid and the operation terminates;

    upload.fields([{
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }]
    
    ),
    
   
    registerUser
    
)

userRouter.route("/login").post(loginUser)

// secured routs

userRouter.route("/logout").post(verifyJWT, logoutUser)

userRouter.route("/refresh-token").post(refreshAccessToken)

userRouter.route("/change-password").post(verifyJWT, changeCurrentPassword)

userRouter.route("/current-user").post(verifyJWT, getCurrentUser)

userRouter.route("/update-account").patch(verifyJWT, updateAccountDetails)

userRouter.route("/avatar").patch(verifyJWT, upload.single("avatar"), updateUserAvatar)

userRouter.route("/cover-image").patch(verifyJWT, upload.single("coverImage"), updateUserCoverImage)

userRouter.route("/c/:username").get(verifyJWT, getUserChannelProfile)

userRouter.route("/history").get(verifyJWT, getWatchHistory)


export default userRouter