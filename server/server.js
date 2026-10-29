
require('dotenv').config();

const express = require('express');
const connectDB = require('./config/db');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const cors = require ('cors');



const MongoStore = require('connect-mongo').default;
const productRoutes = require('./routes/productRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const authRoutes = require('./routes/authRoutes');
const cartRoutes = require('./routes/cartRoutes');
const errorHandler = require('./middleware/errorHandler');
const { mongo } = require('mongoose');
const adminRoutes =require('./routes/adminRoutes');
const orderRoutes = require('./routes/orderRoutes');


const paymentRoutes = require('./routes/paymentRoutes');


const app = express();

  app.set("trust proxy", 1);
const PORT = process.env.PORT || 3002;

  app.use(cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  }));
// app.use (
//   cors({
//     origin: 'http://localhost:5173',
//     credentials: true,
//   })
// );

// Middleware: allows Express to read JSON request bodies.
app.use(express.json());

// middleware for cookie parser
app.use(cookieParser());

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
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24, // 1 day
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

app.use('/api/cart', cartRoutes);

app.use('/api/admins', adminRoutes);
app.use('/api/orders' , orderRoutes);


app.use('/api/payments', paymentRoutes);

app.use(errorHandler);

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
