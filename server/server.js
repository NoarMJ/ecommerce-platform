
require('dotenv').config();

const http = require('http');
const express = require('express');
const connectDB = require('./config/db');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const cors = require('cors');

const MongoStore = require('connect-mongo').default;

// Routes
const productRoutes = require('./routes/productRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const authRoutes = require('./routes/authRoutes');
const cartRoutes = require('./routes/cartRoutes');
const adminRoutes = require('./routes/adminRoutes');
const orderRoutes = require('./routes/orderRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

// Middleware
const errorHandler = require('./middleware/errorHandler');

// Socket.IO
const { attachSocket } = require('./socket');

const app = express();

app.set('trust proxy', 1);

const PORT = process.env.PORT || 3002;

// CORS configuration
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);

// Middleware: allows Express to read JSON request bodies.
app.use(express.json());

// Middleware for cookie parsing
app.use(cookieParser());

// Session middleware.
// Kept in a variable so Socket.IO can reuse it.
const sessionMiddleware = session({
  name: 'ecommerce.sid',
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  proxy: true,

  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    collectionName: 'sessions',
  }),

  cookie: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24, // 1 day
  },
});

// Register session middleware with Express
app.use(sessionMiddleware);

// Health route: checks whether the API is running.
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'E-commerce API is running',
  });
});

// API Routes
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/admins', adminRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);

// Global error handler
app.use(errorHandler);

// Connect to MongoDB before starting the API server.
const startServer = async () => {
  try {
    await connectDB();

    // One HTTP server for both Express and Socket.IO.
    const server = http.createServer(app);

    // Attach Socket.IO and share Express sessions.
    attachSocket(server, sessionMiddleware);

    server.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });

  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();
