const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

// Configure Cloudinary
cloudinary.config({
  cloud_name: 'dmt1e9ecl',
  api_key: '455724517679442',
  api_secret: 'HWJnw7MdnvHWZAhfu6VCv3f3jaA'
});

// Read and parse the data.js file
const dataFileContent = fs.readFileSync(path.join(__dirname, 'data.js'), 'utf8');
const mockData = eval('(' + dataFileContent.split('=')[1].trim() + ')');

// Get unique image paths
const uniqueImages = [...new Set(mockData.map(item => item.image))];

// Convert relative paths to absolute paths
const imagePaths = uniqueImages.map(relativePath => {
  // Remove './' from the beginning if it exists
  const cleanPath = relativePath.replace(/^\.\//, '');
  return path.join(__dirname, cleanPath);
});

async function uploadImages() {
  try {
    const uploadPromises = imagePaths.map(async (imagePath) => {
      if (fs.existsSync(imagePath)) {
        const result = await cloudinary.uploader.upload(imagePath, {
          folder: 'barter-better'
        });
        console.log(`Uploaded ${path.basename(imagePath)}: ${result.secure_url}`);
        return {
          originalPath: imagePath,
          cloudinaryUrl: result.secure_url
        };
      } else {
        console.error(`Image not found: ${imagePath}`);
        return null;
      }
    });

    const results = await Promise.all(uploadPromises);
    const imageMap = results.reduce((acc, result) => {
      if (result) {
        const relativePath = './' + path.relative(__dirname, result.originalPath).replace(/\\/g, '/');
        acc[relativePath] = result.cloudinaryUrl;
      }
      return acc;
    }, {});

    // Update posts in database
    const { connectToDb, getDb } = require('./mongodb');
    await new Promise((resolve, reject) => {
      connectToDb((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    const db = getDb();
    
    // Update each post with Cloudinary URL
    for (const [originalPath, cloudinaryUrl] of Object.entries(imageMap)) {
      await db.collection('posts').updateMany(
        { image: originalPath },
        { $set: { image: cloudinaryUrl } }
      );
      console.log(`Updated database entries for ${originalPath}`);
    }

    console.log('All images uploaded and database updated');
    process.exit(0);
  } catch (error) {
    console.error('Error uploading images:', error);
    process.exit(1);
  }
}

uploadImages();
