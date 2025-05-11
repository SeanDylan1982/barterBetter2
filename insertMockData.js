const { connectToDb, getDb } = require('./mongodb');
const fs = require('fs');
const path = require('path');

// Read and parse the data.js file
const dataFileContent = fs.readFileSync(path.join(__dirname, 'data.js'), 'utf8');
const mockData = eval('(' + dataFileContent.split('=')[1].trim() + ')');

// Function to insert mock data
async function insertMockData() {
  try {
    await new Promise((resolve, reject) => {
      connectToDb((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    const db = getDb();
    
    // Get Sean's user document
    const sean = await db.collection('users').findOne({ username: 'sean' });
    if (!sean) {
      console.error('User "sean" not found. Creating user...');
      const hashedPassword = require('bcryptjs').hashSync('password123', 10);
      const userResult = await db.collection('users').insertOne({
        username: 'sean',
        email: 'sean@example.com',
        password: hashedPassword
      });
      sean = { _id: userResult.insertedId };
    }

    // Prepare posts with additional fields
    const postsToInsert = mockData.map(item => ({
      ...item,
      userId: sean._id,
      author: 'sean',
      createdAt: new Date(),
      likes: 0,
      comments: []
    }));

    // Insert all posts
    const result = await db.collection('posts').insertMany(postsToInsert);
    console.log(`Successfully inserted ${result.insertedCount} posts`);
    process.exit(0);
  } catch (error) {
    console.error('Error inserting mock data:', error);
    process.exit(1);
  }
}

insertMockData();
