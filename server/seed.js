
// require('dotenv').config();

// const mongoose = require('mongoose');
// const connectDB = require('./config/db');

// const Category = require('./models/category');
// const Product = require('./models/product');

// const seedDatabase = async () => {
//   try {
//     await connectDB();

//     // 1. Create or update our sample categories.
//     const categoryData = [
//       {
//         name: 'Electronics',
//         slug: 'electronics',
//         description: 'Phones and electronic accessories',
//       },
//       {
//         name: 'Fashion',
//         slug: 'fashion',
//         description: 'Clothing and everyday style',
//       },
//       {
//         name: 'Home and Living',
//         slug: 'home-and-living',
//         description: 'Useful products for your home',
//       },
//     ];

//     const categories = {};

//     for (const data of categoryData) {
//       categories[data.slug] = await Category.findOneAndUpdate(
//         { slug: data.slug },
//         { $set: data },
//         {
//           returnDocument: 'after',
//           upsert: true,
//           runValidators: true,
//         }
//       );
//     }

//     // 2. Create or update products linked to their categories.
//     const productData = [
//       {
//         name: 'Wireless Headphones',
//         slug: 'wireless-headphones',
//         description: 'Comfortable wireless headphones for everyday listening.',
//         category: categories.electronics._id,
//         priceMinor: 250000,
//         images: [],
//         stock: 20,
//         sku: 'ELEC-001',
//       },
//       {
//         name: 'Smartphone',
//         slug: 'smartphone',
//         description: 'A smartphone for communication and everyday tasks.',
//         category: categories.electronics._id,
//         priceMinor: 1500000,
//         images: [],
//         stock: 10,
//         sku: 'ELEC-002',
//       },
//       {
//         name: 'Casual T-Shirt',
//         slug: 'casual-t-shirt',
//         description: 'A comfortable T-shirt for everyday wear.',
//         category: categories.fashion._id,
//         priceMinor: 120000,
//         images: [],
//         stock: 35,
//         sku: 'FASH-001',
//       },
//       {
//         name: 'Desk Lamp',
//         slug: 'desk-lamp',
//         description: 'A practical lamp for reading and working.',
//         category: categories['home-and-living']._id,
//         priceMinor: 85000,
//         images: [],
//         stock: 15,
//         sku: 'HOME-001',
//       },
//     ];

//     for (const data of productData) {
//       await Product.findOneAndUpdate(
//         { sku: data.sku },
//         { $set: data },
//         {
//           returnDocument: 'after',
//           upsert: true,
//           runValidators: true,
//         }
//       );
//     }

//     console.log('Sample categories and products are ready.');
//     console.log(`Categories processed: ${categoryData.length}`);
//     console.log(`Products processed: ${productData.length}`);
//   } catch (error) {
//     console.error('Database seeding failed:', error.message);
//     process.exitCode = 1;
//   } finally {
//     await mongoose.connection.close();
//   }
// };

// seedDatabase();
