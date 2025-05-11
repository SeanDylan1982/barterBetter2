const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { connectToDb, getDb } = require('./mongodb');
const bcrypt = require('bcryptjs');
const { ObjectId } = require('mongodb');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

// Configure Cloudinary
cloudinary.config({
  cloud_name: 'dmt1e9ecl',
  api_key: '455724517679442',
  api_secret: 'HWJnw7MdnvHWZAhfu6VCv6f3jaA'
});

// Configure Multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));  // Add this line for form data
app.use(express.static('.'));

let db;
const PORT = process.env.PORT || 3001; // Try port 3001 if 3000 is taken

// Function to start server
const startServer = (port) => {
  return new Promise((resolve, reject) => {
    const server = app.listen(port)
      .once('listening', () => {
        console.log(`Server is running on port ${port}`);
        resolve(server);
      })
      .once('error', err => {
        if (err.code === 'EADDRINUSE') {
          console.log(`Port ${port} is busy, trying ${port + 1}`);
          server.close();
          resolve(startServer(port + 1));
        } else {
          reject(err);
        }
      });
  });
};

// Connect to MongoDB and start server
connectToDb(async (err) => {
  if (!err) {
    try {
      db = getDb();
      await startServer(PORT);
    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  } else {
    console.error('Failed to connect to database:', err);
    process.exit(1);
  }
});

// User Registration
app.post('/api/register', async (req, res) => {
  try {
    console.log('Registration attempt:', { ...req.body, password: '[HIDDEN]' });
    
    const { username, email, password } = req.body;
    
    // Validate input
    if (!username || !email || !password) {
      console.error('Missing required fields:', { 
        hasUsername: !!username, 
        hasEmail: !!email, 
        hasPassword: !!password 
      });
      return res.status(400).json({ 
        error: 'Missing required fields',
        details: {
          username: !username ? 'Username is required' : null,
          email: !email ? 'Email is required' : null,
          password: !password ? 'Password is required' : null
        }
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.error('Invalid email format:', email);
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check if user already exists
    console.log('Checking for existing user with email:', email);
    const existingUser = await db.collection('users').findOne({ email });
    if (existingUser) {
      console.log('User already exists with email:', email);
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    console.log('Hashing password...');
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create new user
    const newUser = {
      username,
      email,
      password: hashedPassword,
      createdAt: new Date(),
      profileComplete: false
    };
    
    console.log('Creating new user:', { ...newUser, password: '[HIDDEN]' });
    const result = await db.collection('users').insertOne(newUser);
    
    console.log('User created successfully:', result.insertedId);
    res.status(201).json({ 
      message: 'User registered successfully',
      userId: result.insertedId,
      username: username
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ 
      error: 'Error registering user',
      details: err.message 
    });
  }
});

// User Login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user
    const user = await db.collection('users').findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    res.json({ 
      message: 'Login successful',
      userId: user._id,
      username: user.username
    });
  } catch (err) {
    res.status(500).json({ error: 'Error during login' });
  }
});

// Create/Update Profile
app.post('/api/profile', async (req, res) => {
  try {
    const { userId, ...profileData } = req.body;
    
    const result = await db.collection('users').updateOne(
      { _id: userId },
      { 
        $set: {
          ...profileData,
          profileComplete: true,
          updatedAt: new Date()
        }
      }
    );

    res.json({ message: 'Profile updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Error updating profile' });
  }
});

// Create new post
app.post('/api/posts', upload.array('images', 5), async (req, res) => {
  try {
    const { title, description, category, region, contact } = req.body;
    const userId = req.body.userId; // From frontend localStorage
      // Validate required fields
    if (!title || !description || !category || !region || !userId) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        missing: Object.entries({ title, description, category, region, userId })
          .filter(([_, value]) => !value)
          .map(([key]) => key),
        receivedFields: { title, description, category, region, userId }
      });
    }
    
    console.log('Creating post with userId:', userId);// Get user info
    let user;
    try {
      user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
    } catch (error) {
      console.error('Error finding user:', error);
      return res.status(400).json({ error: 'Invalid user ID format' });
    }

    // Create post object
    const post = {
      title,
      description, // Using description instead of body
      category,
      region,
      contact,
      userId: new ObjectId(userId),
      author: user.username,
      createdAt: new Date(),
      likes: [],
      comments: [],
      image: './img/logo2.png' // Default image
    };

    // Upload images to Cloudinary if provided
    if (req.files && req.files.length > 0) {
      const file = req.files[0]; // Get first image
      try {
        const result = await cloudinary.uploader.upload(file.path);
        post.image = result.secure_url;
        // Clean up uploaded file
        fs.unlinkSync(file.path);
      } catch (err) {
        console.error('Error uploading to Cloudinary:', err);
      }
    }

    // Insert post into database
    const result = await db.collection('posts').insertOne(post);
    res.status(201).json({ 
      message: 'Post created successfully',
      postId: result.insertedId 
    });
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Error creating post' });
  }
});

// Update profile with avatar
// Get all posts
app.get('/api/posts', async (req, res) => {
  try {
    const posts = await db.collection('posts')
      .find({})
      .sort({ createdAt: -1 })
      .toArray();
    res.json(posts);
  } catch (err) {
    console.error('Error fetching posts:', err);
    res.status(500).json({ error: 'Error fetching posts' });
  }
});

app.post('/api/profile/avatar', upload.single('avatar'), async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const result = await cloudinary.uploader.upload(req.file.path);
    fs.unlinkSync(req.file.path); // Clean up uploaded file

    const updateResult = await db.collection('users').updateOne(
      { _id: new ObjectId(userId) },
      { $set: { avatarUrl: result.secure_url } }
    );

    if (updateResult.modifiedCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ 
      message: 'Profile image updated successfully',
      avatarUrl: result.secure_url
    });
  } catch (err) {
    console.error('Error updating profile image:', err);
    res.status(500).json({ error: 'Error updating profile image' });
  }
});

// Search posts
app.get('/api/posts/search', async (req, res) => {
  try {
    const { 
      query, 
      category, 
      location, 
      minPrice, 
      maxPrice, 
      sortBy, 
      sortOrder,
      condition 
    } = req.query;
    
    let filter = {};

    if (query) {
      filter.$or = [
        { title: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } }
      ];
    }

    if (category && category !== 'all') {
      filter.category = category;
    }

    if (location && location !== 'all') {
      filter.location = location;
    }

    if (condition && condition !== 'all') {
      filter.condition = condition;
    }

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }

    const posts = await db.collection('posts')
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();

    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: 'Error searching posts' });
  }
});

// Get posts by category
app.get('/api/posts/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const posts = await db.collection('posts')
      .find({ category })
      .sort({ createdAt: -1 })
      .toArray();
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching posts by category' });
  }
});

// User notifications
app.post('/api/notifications', async (req, res) => {
  try {
    const { userId, type, message, relatedId } = req.body;
    
    const notification = {
      userId,
      type, // 'like', 'comment', 'mention'
      message,
      relatedId, // postId or commentId
      createdAt: new Date(),
      read: false
    };
    
    await db.collection('notifications').insertOne(notification);
    res.status(201).json({ message: 'Notification created' });
  } catch (err) {
    res.status(500).json({ error: 'Error creating notification' });
  }
});

// Get user notifications
app.get('/api/notifications/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const notifications = await db.collection('notifications')
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray();
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching notifications' });
  }
});

// Mark notification as read
app.put('/api/notifications/:notificationId', async (req, res) => {
  try {
    const { notificationId } = req.params;
    
    const result = await db.collection('notifications').updateOne(
      { _id: new ObjectId(notificationId) },
      { $set: { read: true } }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ message: 'Notification marked as read' });
  } catch (err) {
    res.status(500).json({ error: 'Error updating notification' });
  }
});

// Get Posts with filtering and sorting
app.get('/api/posts', async (req, res) => {
  try {
    const {
      category,
      region,
      minPrice,
      maxPrice,
      condition,
      sortBy,
      sortOrder,
      page = 1,
      limit = 10
    } = req.query;

    // Build filter query
    const filter = {};
    if (category && category !== 'all') filter.category = category;
    if (region && region !== 'all') filter.region = region;
    if (condition && condition !== 'all') filter.condition = condition;
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    // Build sort query
    const sort = {};
    if (sortBy) {
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    } else {
      sort.createdAt = -1; // Default sort by newest
    }

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const posts = await db.collection('posts')
      .find(filter)
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))
      .toArray();

    // Get total count for pagination
    const total = await db.collection('posts').countDocuments(filter);

    res.json({
      posts,
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching posts' });
  }
});

// Like/Unlike post
app.post('/api/posts/:postId/like', async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'User must be logged in' });
    }

    const post = await db.collection('posts').findOne({ _id: new ObjectId(postId) });
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const likes = post.likes || [];
    const userIdObj = new ObjectId(userId);
    const hasLiked = likes.some(id => id.equals(userIdObj));

    if (hasLiked) {
      // Unlike
      await db.collection('posts').updateOne(
        { _id: new ObjectId(postId) },
        { $pull: { likes: userIdObj } }
      );
    } else {
      // Like
      await db.collection('posts').updateOne(
        { _id: new ObjectId(postId) },
        { $push: { likes: userIdObj } }
      );
    }

    res.json({ liked: !hasLiked });
  } catch (error) {
    res.status(500).json({ error: 'Error updating like status' });
  }
});

// Add comment
app.post('/api/posts/:postId/comments', async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId, text } = req.body;

    if (!userId || !text) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const comment = {
      _id: new ObjectId(),
      userId: new ObjectId(userId),
      author: user.username,
      text,
      createdAt: new Date()
    };

    await db.collection('posts').updateOne(
      { _id: new ObjectId(postId) },
      { $push: { comments: comment } }
    );

    res.status(201).json(comment);
  } catch (error) {
    res.status(500).json({ error: 'Error adding comment' });
  }
});

// Delete post (only by owner)
app.delete('/api/posts/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId } = req.body;

    const post = await db.collection('posts').findOne({ _id: new ObjectId(postId) });
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post.userId.toString() !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this post' });
    }

    await db.collection('posts').deleteOne({ _id: new ObjectId(postId) });
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting post' });
  }
});

// Posts endpoints with improved error handling
app.post('/api/posts', upload.single('image'), async (req, res) => {
  try {
    const { title, description, userId, username, category } = req.body;
    
    // Validate required fields
    if (!title || !description || !userId || !username || !category) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate userId format
    if (!ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid user ID format' });
    }

    let imageUrl = null;
    if (req.file) {
      try {
        const result = await cloudinary.uploader.upload(req.file.path);
        imageUrl = result.secure_url;
        // Clean up the local file
        fs.unlinkSync(req.file.path);
      } catch (uploadError) {
        console.error('Image upload error:', uploadError);
        return res.status(500).json({ error: 'Failed to upload image' });
      }
    }

    const post = {
      title,
      description,
      userId: new ObjectId(userId),
      username,
      category,
      imageUrl,
      createdAt: new Date(),
      likes: 0,
      comments: []
    };

    const result = await db.collection('posts').insertOne(post);
    res.status(201).json({ 
      message: 'Post created successfully',
      postId: result.insertedId 
    });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

app.get('/api/posts', async (req, res) => {
  try {
    const { category, userId, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    
    let query = {};
    if (category) query.category = category;
    if (userId && ObjectId.isValid(userId)) query.userId = new ObjectId(userId);

    const [posts, total] = await Promise.all([
      db.collection('posts')
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .toArray(),
      db.collection('posts').countDocuments(query)
    ]);

    res.json({
      posts,
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
      totalPosts: total
    });
  } catch (error) {
    console.error('Fetch posts error:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

app.get('/api/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid post ID format' });
    }

    const post = await db.collection('posts').findOne({ _id: new ObjectId(id) });
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json(post);
  } catch (error) {
    console.error('Fetch post error:', error);
    res.status(500).json({ error: 'Failed to fetch post' });
  }
});

// Test endpoint to verify MongoDB connection
app.get('/api/test-connection', async (req, res) => {
  try {
    // Try to ping the database
    await db.command({ ping: 1 });
    // Try to get a count of users
    const userCount = await db.collection('users').countDocuments();
    res.json({ 
      status: 'success',
      message: 'MongoDB connection is working',
      userCount
    });
  } catch (error) {
    console.error('Database test failed:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Failed to connect to database',
      error: error.message
    });
  }
});

module.exports = app;
