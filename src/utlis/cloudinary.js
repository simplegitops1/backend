import {v2 as cloudinary} from "cloudinary";
import fs from "fs";

cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key:  process.env.CLOUDINARY_API_KEY , 
  api_secret: process.env.CLOUDINARY_API__SECRET, 
});

const uploadOnCloudinary = async(localFilepath) => {
    try {
    if(!localFilepath) return null;
    const responce =  await cloudinary.uploader.upload(localFilepath,{
        resource_type: "auto",
    });
    //console.log("file is upload on cloudinary", responce.url);
    fs.unlinkSync(localFilepath);
    return responce;
    } catch (error) {
        fs.unlinkSync(localFilepath);
        return null;
        
    }
    
}

export {uploadOnCloudinary};