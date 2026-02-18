import { asyncHandler } from "../utlis/asyncHandler.js";
import {ApiError} from "../utlis/apiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utlis/cloudinary.js"
import { ApiResponce } from "../utlis/ApiResponce.js";
import jwt from "jsonwebtoken"
import mongoose from "mongoose";


const generateAccessandRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accesstoken = await user.generateAccessToken()
        const refreshtoken = await user.generateRefreshToken()
    
        user.refreshtoken = refreshtoken
        await user.save({ValidedBeforeSave: false})
        return {accesstoken, refreshtoken}
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating access and refresh token")
    }
}

const registerUser = asyncHandler(async (req, res) => {
    //get user details from frontend
    //validation-not empty
    //check if user already exit:  username,email
    //check for images, check for avatar
    //upload them to cloudinary, avatar
    //create user object- craete entry in db
    //remove password and refresh tooken field froom response
    //check for user creation
    // return res

    // 1.  get user details from frontend
    const{fullname,email,username,password} = req.body
    //console.log("email:", email);

    // 2. validation- empty
    if(
        [fullname,email,username,password].some((field) => field?.trim() === "")
    ){
        throw new ApiError(400,"All fields are required")
    }

    // 3. check if user already exit
    const existedUser = await User.findOne({
        $or: [{username}, {email}]
    })
    if(existedUser){
        throw new ApiError(409,"User with email or username already exist") 
    }

    // 4. check for images,check for avatar
    let avatarLocalPath;
    if (req.files && Array.isArray(req.files.avatar) && req.files.avatar.length > 0) {
        avatarLocalPath = req.files.avatar[0].path;
}

    //const coverImageLocalPath = req.files?.coverImage[0]?.path


    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }
    

    //if (!avatarLocalPath) {
      //  throw new ApiError (400,"Avatar file is  required")
   // }

    // 5. upload them to cloudinary,  avatar
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    //if(!avatar){
       //throw new ApiError(400,"Avatar file is  required")
    //}
    
    // 6. create user object- craete entry in db
    const user = await User.create({
        fullname,
        //avatar: avatar.url,
        //coverImage: coverImage?.url || "",
        email,
        password,
        username: username?.toLowerCase()
        
    })
    // 7. remove password and refresh tooken field froom response
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    // 8. check for user creation
    if(!createdUser){
        throw new ApiError(500,"Something went wrong while Registering user")
    }
    // 9. return res

    res.status(201).json(
        new ApiResponce (200,createdUser,"User Registered Successfully")
    )

});

const loginUser = asyncHandler(async (req,res)=>{
    // req body --> data
    // username or email
    // find the user 
    // password check 
    // access and refresh token
    // send cookie

    const {username,email,password} = req.body

    if (!username && !email) {
        throw new ApiError(401,"username or email is  required")
    }

    const user = await User.findOne({
        $or: [{username}, {email}]
    })
    if(!user){
        throw new ApiError(404,"User does not exist") 
    }

    const passwordvalid = await user.isPasswordCorrect(password)

    if(!passwordvalid){
        throw new ApiError(401,"Invalid User credential")
    }
    const {accesstoken, refreshtoken} = await generateAccessandRefreshToken(user._id)

    const loggedInUser = User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure : true
    }
    return res.status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponce(
            200,{
                user: loggedUser,
                accesstoken,
                refreshtoken
            },
            "User logged is successfully"
        )  
    )
})

const logoutUser = asyncHandler(async (req,res)=>{
    await User.findByIdAndUpdate(req.user._id,{
        $unset: {
            refreshToken: "undefined"
        }
    },
    {
        new: true
    }
)
const options = {
    httpOnly: true,
    secure : true
}

return res
.status(200)
.clearCookie("accessToken",options)
.clearCookie("refreshToken",options)
.json(new ApiResponce(200,{},"User logged out successfully"))

})

const AccessRefreshToken = asyncHandler(async(req,res) => {
    try {
        const inComingRefresh = await req.cookies.refreshToken || req.body.refreshToken

    if (!inComingRefresh) {
        throw new ApiError(401,"Unauthorized request")
    }

    const decodedToken = jwt.verify(inComingRefresh,process.env.REFRESH_TOKEN_SECRET)

    const user = await User.findById(decodedToken?._id)

    if (!user) {
        throw new ApiError(401,"Invalid Refresh Token")
    }

    if (inComingRefresh !== user?.refreshToken) {
        throw new ApiError(401,"Refresh token is expired or used ")
    }
    const options = {
        httpOnly: true,
        secure : true
    }

    const {accesstoken, refreshtoken:newRefreshToken} = await generateAccessandRefreshToken(user._id)

    return res
    .status(200)
    .Cookie("accessToken", accesstoken,options)
    .Cookie("refreshToken", newRefreshToken,options)
    .json(
        new ApiResponce
        (200,
            {accessToken,refreshToken: newRefreshToken},
            "Access token refreshed"
        ))
}
    catch (error) {
        throw new ApiError(401,error?.message || "Invalid refresh Token")
    }

})

const ChangeCurrentPassword = asyncHandler(async(req,res) =>{
    const {oldPassword,newPassword} = req.body

    const user = await User.findById(req.user?._id)
    const isPasswordvalid = await User.isPasswordCorrect(oldPassword)

    if (!isPasswordvalid) {
        throw new ApiError(401,"Invalid old password")
    }

    user.password = newPassword
    await user.save({validateBeforeSave: false})

    return res
    .status(200)
    .json
    (new ApiResponce (200, {}, "Password change Successfully"))
})

const getCurrentUser = asyncHandler(async(req,res) =>{
    return res
    .status(200)
    .json(new ApiResponce (200,req.user,"User fetch successfully"))
})

const updateAccountDetails = asyncHandler(async(req,res)=>{
    const{fullname,email} = req.body

    if (!fullname || !email) {
        throw new ApiError(401,"All fields are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,{
            $set:{
                fullname,
                email: email
            }
        },
        {
            new: true
        }
        ).select("-password")
    return res
    .status(200)
    .json(new ApiResponce(200,user, "Account details update"))
})

const updateUserAvatar = asyncHandler(async(req,res) =>{
    const avatarLocalPath = req.file?.path

    //if (!avatarLocalPath) {
       // throw new ApiError(401,"Avatar file are required")
    //}

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    //if (!avatar.url) {
        //throw new ApiError(401,"Error while uploading on avatar")
    //}

    const user  = await User.findByIdAndUpdate(
        req.user?._id,{
            $set:{
                avatar:avatar.url
            }
        },
        {
            new: true
        }
        ).select("-password")
    return res
    .status(200)
    .json(new ApiResponce(201,user,"Avatar Image Upload SuccessFully"))
})

const updateUserCoverImage = asyncHandler(async(req,res) =>{
    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath) {
        throw new ApiError(401,"coverImage file are required")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!coverImage.url) {
        throw new ApiError(401,"Error while uploading on coverImage")
    }

    const user  = await User.findByIdAndUpdate(
        req.user?._id,{
            $set:{
                coverImage:coverImage.url
            }
        },
        {
            new: true
        }
        ).select("-password")
    return res
    .status(200)
    .json(new ApiResponce(201,user,"Cover Image Upload SuccessFully"))
})

const getUserChannelProfile = asyncHandler(async(req,res) =>{
    const {username} = req.params

    if(!username?.trim()){
        throw new ApiError(401,"Username is missing")
    }

    const channel = await User.aggregate([
        {
            $match:{
                username:username.toLowerCase()
            }
        },
        {
            $lookup:{
                from:"subscriptions",
                localField:"_id",
                foreignField:"channel",
                as:"subscribers"
            }
        },
        {
            $lookup:{
                from:"subscriptions",
                localField:"_id",
                foreignField:"subscriber",
                as:"subscribedTo"
            }
        },
        {
           $addFields:{
                subscribersCount:{
                    $size:"$subscribers"
                },
                channelsubscribedToCount:{
                    $size:"$subscribedTo"
                },
                isSubscribed:{
                    $cond:{
                        if:{
                            $in:[req.user?._id,"$subscribers.subscriber"]
                        },
                        then:true,
                        else:false
                    }
                }
           } 
        },
        {
            $project:{
                fullname:1,
                username:1,
                subscribersCount:1,
                channelsubscribedToCount:1,
                isSubscribed:1,
                avatar:1,
                coverImage:1,
                email:1
            }
        },
    ])
    console.log(channel)

    if(!channel?.length){
        throw new ApiError(400,"Channel does not exit")
    }
    return res
    .status(200)
    .json(
        new ApiResponce(
            200,channel[0],"User Channel Fetch Successfully"
    ))
})

const getWatchHistory = asyncHandler(async(req,res) =>{
    const user = await User.aggregate([
        {
            $match:{
                _id:new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup:{
                from:"videos",
                localField:"watchHistory",
                foreignField:"_id",
                as:"watchHistory",
                pipeline:[
                    {
                        from:"user",
                        localField:"owner",
                        foreignField:"_id",
                        as:"owner",
                        pipeline:[
                            {
                                $project:{
                                    fullname:1,
                                    username:1,
                                    avatar:1
                                }
                            }
                        ]
                    },
                    {
                        $addFields:{
                            owner:{
                                $first:"$owner"
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
        new ApiResponce(
            200,user[0].WatchHistory,"Watch History Fetch Successfully"
        ))
})

export  {
    registerUser,
    loginUser,
    logoutUser,
    AccessRefreshToken,
    ChangeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
};