# Bookstore final project

Implementation based on the IBM starter:
https://github.com/ibm-developer-skills-network/expressBookReviews

## Run
Requires Node.js 20 or newer.

    cd final_project
    npm ci
    npm start

The API listens on http://127.0.0.1:5000. Set PORT to change the port.
The official starter's ten books are preserved in router/books.json.
The numeric keys 1 through 10 are the starter's ISBN identifiers.

## Verify
From final_project:

    npm test
    npm run evidence

The evidence script starts its own fresh server on port 5000; stop npm start first.
It executes real cURL requests and writes their commands and responses into
the evidence directory at the repository root. Its credentials.json contains
only a disposable demonstration account. Run the recorded commands from that
directory, in question order, against a fresh server. In Windows PowerShell,
use curl.exe instead of curl if curl is an Invoke-WebRequest alias.

## Submission
Copy the full contents of these evidence files into the matching answer:
1. githubrepo
2. getallbooks
3. getbooksbyISBN
4. getbooksbyauthor
5. getbooksbytitle
6. getbookreview
7. register
8. login
9. reviewadded
10. deletereview

Question 11:
https://github.com/Mardan7/Final-project/blob/main/final_project/router/general.js

IMPORTANT: Final-project was created independently, not as a GitHub fork.
The captured githubrepo response truthfully reports fork:false and DOES NOT
satisfy Question 1. The assignment names expressBookReview, but the available
official repository is expressBookReviews (plural). Create a real fork of it,
push this implementation to that fork, and regenerate evidence with
EVIDENCE_REPO set to its owner/name. Then use that fork's general.js URL.

## Implementation
Public routes: GET /, /isbn/:isbn, /author/:author, /title/:title,
/review/:isbn; POST /register.
Customer routes: POST /customer/login; PUT and DELETE /customer/auth/review/:isbn.
PUT accepts a JSON review field or the lab's review query parameter.
Author and title searches match complete strings without case sensitivity.

general.js exports getAllBooks, getBooksByISBN, getBooksByAuthor and
getBooksByTitle. They use Axios with async/await or promise callbacks;
createBookClient allows a different API base URL.

Passwords are salted and hashed asynchronously with scrypt. Session cookies
identify the logged-in reviewer. A username reservation prevents duplicate
registrations during concurrent password hashing. Review changes operate only
on the logged-in user's own entry.

This is a single-process coursework application. Users, sessions, and review
changes live in memory and reset on restart. A deployed multi-process service
would need a shared persistent database/session store, HTTPS, and a configured
SESSION_SECRET.
