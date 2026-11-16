const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/tea_business_db';
  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`⚠️ MongoDB Connection Error: ${error.message}`);
    console.error(`👉 Make sure MongoDB is running. On macOS run:`);
    console.error(`   brew services start mongodb-community`);
    console.error(`   or: mongod --config /opt/homebrew/etc/mongod.conf\n`);
  }
};

module.exports = connectDB;
