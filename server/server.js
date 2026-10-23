
require('dotenv').config();

const express = require('express');
const connectDB = require('./config/db');
const session = require('express-session');
const MongoStore = require('connect-mongo').default;
const productRoutes = require('./routes/productRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const authRoutes = require('./routes/authRoutes');
const { mongo } = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware: allows Express to read JSON request bodies.
app.use(express.json());

// Middleware
app.use(
    session({
        name: 'ecommerce.sid',
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,

        store: MongoStore.create({
            mongoUrl: process.env.MONGODB_URI,
            collectionName: 'sessions',
        }),

        cookie: {
            httpOnly:true,
            secure: false,
            sameSite: 'lax',
            maxAge:24 * 60 * 60 * 1000,
        },
    })
);

// Health route: checks whether the API is running.
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'E-commerce API is running',
  });
});

app.use('/api/categories' , categoryRoutes)
app.use('/api/products' , productRoutes);
app.use('/api/auth' , authRoutes);


// Connect to MongoDB before starting the API server.
const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();
