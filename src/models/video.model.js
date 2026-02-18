import mongoose, {Schema} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new Schema({
    videofile: {
        type: String,
        requried : true
    },
    thumbnail:{
        type: String,
        requried : true
    },
    title:{
        type: String, 
        requried : true
    },
    description:{
        type: String,
        requried : true
    },
    duration :{
        type: Number,
        requried : true
    },
    views:{
        type: Number,
        requried : true
    },
    isPublished:{
        type: Boolean,
        requried : true
    },
    owner:{
        type: Schema.Types.ObjectId,
        ref: "User"
    }
},{timestamps: true})
videoSchema.plugin(mongooseAggregatePaginate);

export const Video = mongoose.model("Video", videoSchema);