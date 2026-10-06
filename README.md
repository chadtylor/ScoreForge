# ScoreForge

ScoreForge is a full-stack tournament scoring and data management system built with Node.js, Express, SQLite, HTML, CSS and JavaScript.

The application is designed to support fast tournament administration, structured score entry, automatic leaderboard generation and persistent database storage.

## Features

- User registration and login
- Password hashing with bcrypt
- Session-based authentication
- Tournament creation
- Team management
- Automatic fixture generation
- Fast score entry
- Server-side score validation
- Automatic leaderboard calculation
- Wins, draws and losses tracking
- Goal difference calculation
- Tournament progress tracking
- Recent activity log
- Persistent SQLite database storage
- Responsive dashboard interface
- Protected dashboard routes
- Authentication rate limiting

## Technologies Used

- HTML5
- CSS3
- JavaScript
- Node.js
- Express.js
- SQLite
- Better SQLite3
- bcrypt.js
- express-session
- express-rate-limit
- Helmet

## Project Structure

```text
scoreforge/
│
├── package.json
├── server.js
├── database.js
├── .gitignore
│
└── public/
    ├── index.html
    ├── dashboard.html
    ├── style.css
    └── script.js
