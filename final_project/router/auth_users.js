const express = require('express');
const {randomBytes, scrypt, timingSafeEqual} = require('node:crypto');
const deriveKey = require('node:util').promisify(scrypt);
const books = require('./booksdb');
const authenticated = express.Router();
const users = new Map();
const pending = new Set();
const isValid = username => users.has(username);
const valid = (u,p) => typeof u === 'string' && u.trim().length > 0 && u.length <= 100 && typeof p === 'string' && p.length > 0 && p.length <= 1024;
async function register(req,res,next) {
  const {username,password} = req.body || {};
  if (!valid(username,password)) return res.status(400).json({message:'A username and password are required'});
  if (users.has(username) || pending.has(username)) return res.status(409).json({message:'User already exists'});
  // Reserve before awaiting hashing, preventing concurrent duplicate registrations.
  pending.add(username);
  try {
    const salt = randomBytes(16).toString('hex');
    const hash = await deriveKey(password,salt,64);
    users.set(username,{salt,hash});
    res.status(201).json({message:'User successfully registered. Now you can login'});
  } catch(error) { next(error); } finally { pending.delete(username); }
}
authenticated.post('/login',async (req,res,next) => {
  const {username,password} = req.body || {};
  if (!valid(username,password)) return res.status(400).json({message:'A username and password are required'});
  try {
    const user = users.get(username);
    if (!user || !timingSafeEqual(await deriveKey(password,user.salt,64),user.hash)) return res.status(401).json({message:'Invalid username or password'});
    req.session.regenerate(error => {
      if(error) return next(error);
      req.session.username = username;
      req.session.save(error => error ? next(error) : res.json({message:'User successfully logged in',username}));
    });
  } catch(error) { next(error); }
});
authenticated.use('/auth',(req,res,next) => req.session.username ? next() : res.status(401).json({message:'Please login first'}));
authenticated.put('/auth/review/:isbn',(req,res) => {
  if (!Object.hasOwn(books,req.params.isbn)) return res.status(404).json({message:'Book not found'});
  const review = req.body?.review ?? req.query.review;
  if (typeof review !== 'string' || !review.trim() || review.length > 10000) return res.status(400).json({message:'A non-empty review of at most 10000 characters is required'});
  const reviews = books[req.params.isbn].reviews;
  Object.defineProperty(reviews,req.session.username,{value:review,enumerable:true,configurable:true,writable:true});
  res.json({message:'Review successfully added or updated',reviews});
});
authenticated.delete('/auth/review/:isbn',(req,res) => {
  if (!Object.hasOwn(books,req.params.isbn)) return res.status(404).json({message:'Book not found'});
  const reviews = books[req.params.isbn].reviews;
  if (!Object.hasOwn(reviews,req.session.username)) return res.status(404).json({message:'No review found for this user'});
  delete reviews[req.session.username];
  res.json({message:'Review successfully deleted',reviews});
});
module.exports = {authenticated,register,isValid,users};
