const express = require('express');
const axios = require('axios');
const books = require('./booksdb');
const { register } = require('./auth_users');
const general = express.Router();
general.post('/register', register);
general.get('/', (req, res) => res.json(books));
general.get('/isbn/:isbn', (req, res) => Object.hasOwn(books, req.params.isbn) ? res.json(books[req.params.isbn]) : res.status(404).json({message:'Book not found'}));
general.get('/review/:isbn', (req, res) => Object.hasOwn(books, req.params.isbn) ? res.json(books[req.params.isbn].reviews) : res.status(404).json({message:'Book not found'}));
for (const field of ['author', 'title']) {
  general.get('/' + field + '/:query', (req, res) => {
    const matches = Object.fromEntries(Object.entries(books).filter(([, book]) => book[field].toLowerCase() === req.params.query.toLowerCase()));
    res.status(Object.keys(matches).length ? 200 : 404).json(matches);
  });
}
// Asynchronous Axios implementations required by Question 11.
// They call the public API, whose handlers above read the supplied dataset.
function createBookClient(baseURL = 'http://127.0.0.1:5000') {
  const client = axios.create({baseURL, timeout:5000});
  return {
    async getAllBooks() { return (await client.get('/')).data; },
    getBooksByISBN(isbn) { return client.get('/isbn/' + encodeURIComponent(isbn)).then(response => response.data); },
    async getBooksByAuthor(author) { return (await client.get('/author/' + encodeURIComponent(author))).data; },
    async getBooksByTitle(title) { return (await client.get('/title/' + encodeURIComponent(title))).data; }
  };
}
module.exports = { general, createBookClient, ...createBookClient() };
