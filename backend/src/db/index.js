import mongoose from 'mongoose';

// In a serverless environment, the global object is preserved between function invocations.
// We cache the connection and the promise to prevent multiple connections during cold starts.
let cached = global.mongoose;

if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

// function to connect to mongodb database
const connectDB = async () => {
    // If we have a cached connection, return it immediately
    if (cached.conn) {
        return cached.conn;
    }

    // If there is no cached connection promise, create one
    if (!cached.promise) {
        const opts = {
            // Set a 5-second timeout to fail fast if the DB is unreachable
            serverSelectionTimeoutMS: 5000, 
        };
        
        const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI;

        cached.promise = mongoose.connect(mongoURI, opts).then((mongooseInstance) => {
            console.log(`\n MongoDB connected successfully`);
            console.log(`MongoDB host: ${mongooseInstance.connection.host}`);
            return mongooseInstance;
        }).catch((error) => {
            console.error(`MongoDB connection failed: ${error.message}`);
            console.error(`\n[IMPORTANT] If using MongoDB Atlas, make sure your current internet IP address is whitelisted at https://cloud.mongodb.com -> Security -> Network Access -> Add IP Address (or 0.0.0.0/0).`);
            
            // Reset the cached promise so the next request can retry instead of reusing a broken connection
            cached.promise = null;
            throw error;
        });
    }

    try {
        // Await the promise to resolve and save it to the cached connection
        cached.conn = await cached.promise;
    } catch (error) {
        cached.promise = null;
        throw error;
    }

    return cached.conn;
};

export default connectDB; // export as default export