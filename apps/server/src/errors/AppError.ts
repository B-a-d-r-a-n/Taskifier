export class AppError extends Error {
    statusCode: number;
    code: string;

    constructor(statusCode: number, code: string, message: string) {
        super(message);
        this.name = "AppError";
        this.statusCode = statusCode;
        this.code = code;
    }
}

export class NotFoundError extends AppError {
    constructor(code = "NOT_FOUND", message = "Resource not found") {
        super(404, code, message);
    }
}

export class UnauthorizedError extends AppError {
    constructor(code = "UNAUTHORIZED", message = "Not authenticated") {
        super(401, code, message);
    }
}

export class ForbiddenError extends AppError {
    constructor(code = "FORBIDDEN", message = "Access denied") {
        super(403, code, message);
    }
}

export class ValidationError extends AppError {
    constructor(message = "Invalid input") {
        super(400, "VALIDATION_ERROR", message);
    }
}

export class ConflictError extends AppError {
    constructor(code = "CONFLICT", message = "Resource already exists") {
        super(409, code, message);
    }
}
