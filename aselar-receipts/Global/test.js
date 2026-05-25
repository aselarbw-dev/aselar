
async function fixReceiptCollection() {
  try {
    console.log('Checking collection indexes...');
    const NewReceipt = require('./models/inventoryReceipts.js'); // Adjust path as needed
    
    // Get all indexes
    const indexes = await NewReceipt.collection.indexes();
    console.log('Current indexes:', JSON.stringify(indexes, null, 2));
    
    // Look for receiptNumber index and drop it if found
    for (const index of indexes) {
      if (index.key && index.key.receiptNumber) {
        console.log('Found receiptNumber index, dropping it...');
        await NewReceipt.collection.dropIndex(index.name);
        console.log('Index dropped successfully');
      }
    }
    
    console.log('Index check complete');
  } catch (error) {
    console.error('Error fixing receipt collection:', error);
  }
}

// Call the function
fixReceiptCollection().then(() => {
  console.log('Receipt collection fix attempt completed');
});

// 8. Test routes