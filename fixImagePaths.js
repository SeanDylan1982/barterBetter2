const { connectToDb, getDb } = require('./mongodb');

async function fixImagePaths() {
  try {
    await new Promise((resolve, reject) => {
      connectToDb((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    const db = getDb();
    
    // Update all posts to remove './' from image paths
    const result = await db.collection('posts').updateMany(
      { image: { $regex: '^./' } },
      [
        {
          $set: {
            image: {
              $substr: [
                '$image',
                2,
                { $strLenCP: '$image' }
              ]
            }
          }
        }
      ]
    );

    console.log(`Updated ${result.modifiedCount} posts`);
    process.exit(0);
  } catch (error) {
    console.error('Error fixing image paths:', error);
    process.exit(1);
  }
}

fixImagePaths();
