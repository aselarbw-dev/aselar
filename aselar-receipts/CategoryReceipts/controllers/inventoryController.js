// controllers/inventoryController.js
const {connectDB} = require('../../Shared/config');


exports.bulkUpload = async (req, res) => {
  const { products } = req.body; // Array of ProductRow
  try {
    // Group products by categoryName
    const grouped = products.reduce((acc, prod) => {
      const catName = prod.categoryName || 'Uncategorized';
      if (!acc[catName]) acc[catName] = [];
      acc[catName].push({
        name: prod.name,
        sellingPrice: prod.sellingPrice,
        costPrice: prod.costPrice,
        quantity: prod.quantity,
        unit: prod.unit,
        expiryDate: new Date(prod.expiryDate),
      });
      return acc;
    }, {});

    // Bulk operations
    const bulkOps = Object.entries(grouped).map(([name, prods]) => ({
      updateOne: {
        filter: { name },
        update: { $push: { products: { $each: prods } } },
        upsert: true, // Create if not exists
      },
    }));
    await connectDB() // connecto to db before any connection
const Category = require('../models/Category');
    await Category.bulkWrite(bulkOps);

    // Recalculate metrics per category (run separately to avoid aggregator complexity)
    const categories = await Category.find({ name: { $in: Object.keys(grouped) } });
    for (const cat of categories) {
      cat.totalCost = cat.products.reduce((sum, p) => sum + p.costPrice * p.quantity, 0);
      cat.totalSales = cat.products.reduce((sum, p) => sum + p.sellingPrice * p.quantity, 0);
      cat.totalProfits = cat.totalSales - cat.totalCost;
      await cat.save();
    }

    // Overall metrics? If needed, aggregate across all categories
    const overall = await Category.aggregate([
      { $group: { _id: null, totalCost: { $sum: '$totalCost' }, totalSales: { $sum: '$totalSales' }, totalProfits: { $sum: '$totalProfits' } } },
    ]);

    res.json({ categories, overall: overall[0] }); // Return for Redux update
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};