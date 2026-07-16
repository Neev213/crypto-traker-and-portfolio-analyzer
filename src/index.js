import dotenv from "dotenv";
import { app } from "./app.js";
import connectDB from "./db/index.js";

dotenv.config({ path: "./.env" });

const PORT = process.env.PORT || 8000;

const startServer = () => {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
        console.log(`Health check: http://localhost:${PORT}/health`);
        console.log(`API base: http://localhost:${PORT}/api/v1`);
    });

    connectDB();
};

if (!process.env.VERCEL) {
    startServer();
}

export default app;
export { app };
