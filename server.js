require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');
const morgan = require('morgan');	    

const app = express();
app.use(morgan('dev'));
// Enhanced CORS configuration for separate frontend/backend
app.use(cors({
  origin: '*', // For development, allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Import routes
const environmentalRoutes = require('./routes/environmentalRoutes');
const authRoutes = require('./routes/authRoutes'); // Add auth routes


// Connect to MongoDB with improved error handling
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ MongoDB Connected Successfully');
    } catch (err) {
        console.error('❌ MongoDB Connection Failed:', err.message);
        process.exit(1);
    }
};
connectDB();

// Sample API Route
app.get('/', (req, res) => {
    res.send('API is running...');
});

// Use routes
app.use('/api', environmentalRoutes);
app.use('/api/auth', authRoutes); // Add auth routes

// Add a test endpoint
app.get('/api/test', (req, res) => {
    res.json({ message: 'Backend connection successful!' });
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 Backend available at http://localhost:${PORT}`);
});