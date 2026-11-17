// One-off backfill of OPENING stock movements.
// Run from the Categories folder:
//   node scripts/backfillOpeningStock.js --dry-run   (shows what would be written)
//   node scripts/backfillOpeningStock.js             (writes it)
const { mongoose, connectDB } = require('../../Shared/config');
const Category = require('../models/categories.js');
const StockMovement = require('../models/StockMovement.js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const DRY_RUN = process.argv.includes('--dry-run');

const run = async () => {
    

  await connectDB();

  // earliest movement per item
  const firstMovements = await StockMovement.aggregate([
    { $sort: { createdAt: 1 } },
    {
      $group: {
        _id: '$itemId',
        firstType: { $first: '$type' },
        firstBalanceBefore: { $first: '$balanceBefore' },
        firstCreatedAt: { $first: '$createdAt' },
      },
    },
  ]);
  const firstByItem = new Map(firstMovements.map((m) => [String(m._id), m]));

  const categories = await Category.find({});
  const entries = [];

  for (const category of categories) {
    for (const item of category.items) {
      const first = firstByItem.get(String(item._id));

      const base = {
        user: category.user,
        categoryId: category._id,
        categoryName: category.name,
        itemId: item._id,
        itemName: item.name,
        barcode: item.barcode || '',
        type: 'OPENING',
        unitPrice: item.sellingPrice,
        unitCost: item.costPrice,
        refType: 'MANUAL',
        refId: '',
        performedBy: 'System',
      };

      if (!first) {
        // never logged: record what is on the shelf now
        const qty = item.quantity || 0;
        if (qty === 0) continue;
        entries.push({
          ...base,
          qtyChange: qty,
          balanceBefore: 0,
          balanceAfter: qty,
          note: 'Opening balance (backfill)',
        });
      } else if (first.firstType !== 'OPENING' && first.firstBalanceBefore > 0) {
        // logged only from some point on: record the balance that existed before it
        entries.push({
          ...base,
          qtyChange: first.firstBalanceBefore,
          balanceBefore: 0,
          balanceAfter: first.firstBalanceBefore,
          createdAt: new Date(new Date(first.firstCreatedAt).getTime() - 1),
          note: 'Opening balance (backfill, before first logged movement)',
        });
      }
    }
  }

  console.log(`Items needing an OPENING row: ${entries.length}`);

  if (DRY_RUN) {
    console.log('Dry run: nothing written. Sample:', entries.slice(0, 3));
  } else if (entries.length > 0) {
    await StockMovement.insertMany(entries, { ordered: false });
    console.log('Backfill written.');
  }

  await mongoose.connection.close();
};

run().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});