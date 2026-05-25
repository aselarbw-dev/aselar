const {mongoose} = require("../../Shared/config");
const fileSchema = mongoose.Schema({
  filename: {
    type: String,
    required: true
  },
  url: {
    type: String,
    required: true
  },
  format: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", // Make sure this matches your User model exactly
    required: true
  }
    
}, {
  timestamps: true
});

const File = mongoose.model("File", fileSchema);
module.exports = File;