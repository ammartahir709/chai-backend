import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
    {
        subscriber:{
            type: mongoose.Schema.Types.ObjectId, // user who is subscribing
            ref: "User"
        },

        channel:{
            type: mongoose.Schema.Types.ObjectId, // user who is being subscribed
            ref: "User"
        },

    },
    
    {timestamps: true}
    
)


const Subscription = mongoose.model("Subscription", subscriptionSchema)