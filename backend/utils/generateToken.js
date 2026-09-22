import jwt from 'jsonwebtoken';

// A JWT has 3 parts: header.payload.signature. We control the payload
// (what goes inside — here just the user's id) and the signature is
// what makes it trustworthy: it's a hash of the header+payload+SECRET.
// Anyone can READ a JWT's payload (it's just base64, not encrypted),
// but only someone with JWT_SECRET can produce a valid signature for it.
// That's why the server can trust "this token says userId X" — a
// tampered token would fail signature verification.
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

export default generateToken;
