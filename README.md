[![Netlify Status](https://api.netlify.com/api/v1/badges/e7a7b71f-3032-4397-9359-79940dc2426d/deploy-status)](https://app.netlify.com/sites/barter-better-basic/deploys)

https://barter-better-basic.netlify.app/

# Barter Better

A platform for bartering goods and services, built with Node.js, Express, and MongoDB.

![Barter Better Logo](./img/logo2.png)

## Features

- User authentication (register/login)
- Create and view posts for items to barter
- Like and comment on posts
- User profiles with customizable information
- Real-time updates
- Mobile-responsive design

## Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript
- **Backend**: Node.js, Express.js
- **Database**: MongoDB
- **Authentication**: bcryptjs

## Setup Instructions

1. **Clone the repository**
   ```bash
   git clone https://github.com/SeanDylan1982/barterBetter2.git
   cd barterBetter2
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up MongoDB**
   - Make sure you have MongoDB installed
   - Update the MongoDB connection string in `mongodb.js` if needed

4. **Start the server**
   - For development:
     ```bash
     npm run dev
     ```
   - For production:
     ```bash
     npm start
     ```

5. **Access the application**
   - Open your browser and navigate to `http://localhost:3000`

## API Endpoints

- **Authentication**
  - POST `/api/register` - Register a new user
  - POST `/api/login` - User login

- **Posts**
  - GET `/api/posts` - Get all posts
  - POST `/api/posts` - Create a new post
  - POST `/api/posts/:postId/like` - Like a post
  - POST `/api/posts/:postId/comments` - Add a comment
  - GET `/api/posts/:postId/comments` - Get post comments

- **Profile**
  - GET `/api/profile/:userId` - Get user profile
  - POST `/api/profile` - Update user profile

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License.
