import type { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/AppError.js";
import { ZodError } from "zod";

export function errorHandler(
    err: Error,
    _req: Request,
    res: Response,
    _next: NextFunction,
): void {
    void _next;
    if (err instanceof AppError) {
        res.status(err.statusCode).json({
            code: err.code,
            message: err.message,
        });
        return;
    }

    if (err instanceof ZodError) {
        res.status(400).json({
            code: "VALIDATION_ERROR",
            message: "Invalid input",
        });
        return;
    }

    console.error("Unhandled error:", err);

    res.status(500).json({
        code: "INTERNAL_ERROR",
        message: "Something went wrong",
    });
}
