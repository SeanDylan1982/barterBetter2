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

// Connect to MongoDB
connectToDb((err) => {
  if (!err) {
    app.listen(3000, () => {
      console.log('Server is running on port 3000');
    });
    db = getDb();
  } else {
    console.error('Failed to connect to database:', err);
  }
});

// User Registration
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // Check if user already exists
    const existingUser = await db.collection('users').findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create new user
    const result = await db.collection('users').insertOne({
      username,
      email,
      password: hashedPassword,
      createdAt: new Date(),
      profileComplete: false
    });

    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Error registering user' });
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

// Create Post
app.post('/api/posts', upload.array('images', 5), async (req, res) => {
  try {
    console.log('Received post creation request:', req.body);  // Debug logging
    const { userId, username, title, subtitle, category, region, description } = req.body;
    
    // Input validation with detailed error message
    const missingFields = [];
    if (!userId) missingFields.push('userId');
    if (!username) missingFields.push('username');
    if (!title) missingFields.push('title');
    if (!category) missingFields.push('category');
    if (!region) missingFields.push('region');
    if (!description) missingFields.push('description');
    
    if (missingFields.length > 0) {
      console.log('Missing required fields:', missingFields);  // Debug logging
      return res.status(400).json({
        error: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    // Process uploaded images
    const imageUrls = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          const result = await cloudinary.uploader.upload(file.path);
          imageUrls.push(result.secure_url);
          // Clean up the uploaded file
          fs.unlinkSync(file.path);
        } catch (uploadError) {
          console.error('Error uploading image:', uploadError);
          // Continue with other images if one fails
        }
      }
    }

    // Create the post object with all required fields
    const post = {
      userId: new ObjectId(userId),
      username,
      title,
      subtitle: subtitle || '',
      category,
      region,
      description,
      imageUrls,
      createdAt: new Date(),
      likes: [],
      comments: []
    };

    console.log('Saving post to database:', post);  // Debug logging
    
    // Ensure we have a database connection
    if (!db) {
      throw new Error('Database connection not established');
    }
    
    const result = await db.collection('posts').insertOne(post);
    
    // Verify the insert was successful
    const savedPost = await db.collection('posts').findOne({ _id: result.insertedId });
    
    if (!savedPost) {
      throw new Error('Post was not saved successfully');
    }
    
    console.log('Post saved successfully:', savedPost);  // Debug logging
    
    res.status(201).json({ 
      message: 'Post created successfully', 
      post: savedPost
    });
  } catch (err) {
    console.error('Error creating post:', err);
    // Send a more detailed error message
    res.status(500).json({ 
      error: 'Error creating post',
      details: err.message,
      // Don't expose stack trace in production
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
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
