//require('dotenv').config({path:'./env'})

import dotenv from "dotenv"
import connectDB from "./db/index.js";
import {app} from './app.js'
dotenv.config({ 
    path: './.env' 
});

connectDB() 
.then(() => {
    app.listen(process.env.PORT|| 8000, () => {
        console.log(`🚀 Server is runnnig on port: ${process.env.PORT}`);
    })
})
.catch((err) => {
    console.log("MONGO DB connection is failed !!!" ,err);
})










/*
import express from "express"
const app = express()

(async () => {
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        console.log("Connected to MongoDB");
        app.on("error",(error) =>{
            console.log("Error:", error);
            throw error
        })

        app.listen(process.env.PORT, () => {
            console.log(`App is listen on port ${process.env.PORT}`);
        })
    } catch (error) {
        console.log("Error connecting to MongoDB", error);
        throw err
    }
})() 
*/  