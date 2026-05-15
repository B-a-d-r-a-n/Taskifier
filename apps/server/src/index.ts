import express from "express";
import cors from "cors";
import { createApp } from "./router.js";
import { prisma } from "./lib/prisma.js";
import { errorHandler } from "./middleware/error.js";

async function main() {
    await prisma.$connect();

    const app = express();

    app.set("trust proxy", 1);

    app.use(
        cors({
            origin: true,
            credentials: true,
            methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
            allowedHeaders: ["Content-Type", "Authorization"],
        }),
    );

    app.use(express.json({ limit: "1mb" }));

    app.use(createApp());

    app.get("/health", (_req, res) => {
        res.json({ status: "ok" });
    });

    app.use(errorHandler);

    const port = parseInt(process.env["PORT"] ?? "3000", 10);

    app.listen(port, (err?: Error) => {
        if (err) {
            console.error("Failed to start server:", err.message);
            process.exit(1);
        }
        console.log(`Server running on port ${port}`);
    });
}

main().catch((err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
});
