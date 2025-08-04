const asyncHandler = (requestHandler) => {
    return (req, res, next) => {
        Promise.resolve(requestHandler(req, res, next))
               .catch((err) => next(err));
    };
};


export { asyncHandler }

// asyncHandler saves you from writing try-catch everywhere in your async/await-based routes by automatically catching errors and passing them using next(error).