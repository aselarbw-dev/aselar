const {mongoose}=require("../../Shared/config");
const receiverSchema=mongoose.Schema({
    companyName: {
        type: String,
        required: [true, 'Company name is required'],
        trim: true,
        maxlength: [100, 'Company name cannot exceed 100 characters']
    },
    addressedTo: {
        type: String,
        required: [true, 'Addressed to is required'],
        trim: true,
        maxlength: [100, 'Addressed to cannot exceed 100 characters']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        trim: true,
        lowercase: true,
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        trim: true,
    },
    date: {
        type: Date,
        default: Date.now,
    },
        preparedBy: {
       type: String,
        required: [true, 'Phone number is required'],
        trim: true,
        }
        
}

,{
    timestamps: true,
}
);

const receivers=mongoose.model("receivers",receiverSchema);
module.exports=receivers;