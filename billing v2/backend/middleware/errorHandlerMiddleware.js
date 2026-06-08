export const errorHandler = (err, req, res, next) => {
    console.error(`[ERROR] ${err.name || 'API Error'}: ${err.message}`);
    if (err.stack) {
        console.error(err.stack);
    }

    // Mongoose duplicate key error
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        return res.status(400).json({
            success: false,
            message: `Duplicate field error: An account or document already exists with this ${field}.`
        });
    }

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const messages = Object.values(err.errors).map(val => val.message);
        return res.status(400).json({
            success: false,
            message: `Validation Error: ${messages.join(', ')}`
        });
    }

    // JWT token errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            message: 'Session invalid. Please log in again.'
        });
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            message: 'Session expired. Please log in again.'
        });
    }

    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        success: false,
        message: err.message || 'Internal Server Error'
    });
};
export default errorHandler;
