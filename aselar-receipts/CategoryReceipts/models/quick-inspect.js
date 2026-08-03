// quick-inspect.js
const { mongoose } = require("../Shared/config"); // adjust path
const Category = mongoose.model("Category", new mongoose.Schema({}, { strict: false }));

async function inspect() {
  const doc = await Category.findOne({});
  console.log(JSON.stringify(doc, null, 2));
  process.exit();
}
inspect();