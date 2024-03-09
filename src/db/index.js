import mongoose from "mongoose";

import { DB_NAME } from "../constants.js";

export const connectDB = async () => {
    try {
        
     //   const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}`);

        console.log(`MONGODB connected !! DB HOST: ${connectionInstance.connection.host}`)

    } catch (error) {
        
        console.error("MONGODB connection error: ", error);
        process.exit(1)

    }
};


