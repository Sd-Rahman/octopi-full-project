// Wraps an async route handler so any thrown error/rejected promise
// is forwarded to next(err) automatically, instead of every controller
// needing its own try/catch. Express's built-in error handling only
// catches SYNCHRONOUS throws by default — this bridges that gap.
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;
