import mongoose from 'mongoose'; // import mongoose to connect to mongodb

// function to connect to mongodb database
const connectDB = async () => {
    try {
        if (mongoose.connection.readyState >= 1) {
            return;
        }
        const connectionInstance = await mongoose.connect(
            process.env.MONGODB_URI || process.env.MONGO_URI,
            { serverSelectionTimeoutMS: 8000 }
        );
        console.log(`\n MongoDB connected successfully`);
        console.log(`MongoDB host: ${connectionInstance.connection.host}`);
    } catch (error) {
        console.error(`MongoDB connection failed: ${error.message}`);
        console.error(`\n[IMPORTANT] If using MongoDB Atlas, make sure your current internet IP address is whitelisted at https://cloud.mongodb.com -> Security -> Network Access -> Add IP Address (or 0.0.0.0/0).`);
        if (!process.env.VERCEL) {
            console.log(`Retrying MongoDB connection in 10 seconds...`);
            setTimeout(connectDB, 10000);
        }
    }
};

export default connectDB; // export as default export