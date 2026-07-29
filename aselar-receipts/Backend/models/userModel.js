const mongoose = require("mongoose")
console.log("User model initialized. Mongoose state:", mongoose.connection.readyState);
const bcrypt = require("bcryptjs")
const userSchema = mongoose.Schema({
    nameOfBusiness: {
        type: String,
        required: true
    },
    emailBusiness: {
        type: String,
        required: true,
        match: [/\S+@\S+\.\S+/, 'Please enter a valid email address']
    },
    businessPhone: {
        type: String,
        required: true
    },
    profilePicture: {
        type: String,
        required: true
    },
    // NEW — added for the marketplace, intentionally optional (see note above)
    place: { type: String },
    city: { type: String },
    location: {
  type: {
    type: String,
    enum: ["Point"],
    // no default here — location should only exist when we explicitly set it after a successful geocode
  },
  coordinates: {
    type: [Number],
    default: undefined,
  },
},
    geocodedAt: { type: Date },
    password: {
        type: String,
        required: true,
        // Enhanced password validation
        validate: {
            validator: function(password) {
                // Only validate on new passwords or when password is being changed
                if (!this.isModified('password')) return true;
                
                // Check for minimum 8 characters, at least one uppercase, one lowercase, one number, and one special character
                const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
                return passwordRegex.test(password);
            },
            message: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)'
        }
    },

    passwordResetToken: String,
    passwordResetExpires: Date,
    
    // Rate limiting fields - added without breaking existing structure
    loginAttempts: { type: Number, default: 0 },
    lockUntil: Date,
    lastLoginAttempt: Date,
    
    createdAt: { type: Date, default: Date.now },
    passcode: { type: String, default: null },
    products: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    Banking: [{ type: mongoose.Schema.Types.ObjectId, ref: "Banking" }],
    categories: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }],
    receipts: [{ type: mongoose.Schema.Types.ObjectId, ref: "receipt" }],
   File: [{ type: mongoose.Schema.Types.ObjectId, ref: "File" }],
}, {
    timestamps: true,
})

// Rate limiting constants
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME = 2 * 60 * 60 * 1000; // 2 hours

// Virtual for checking if account is locked
userSchema.virtual('isLocked').get(function() {
    return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Enhanced password hashing (keeping your existing logic)
userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) {
        return next();
    }

    // Hash password with higher salt rounds for better security
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(this.password, salt);
    this.password = hashedPassword;
    next();
});

// Method to handle failed login attempts
userSchema.methods.incLoginAttempts = function() {
    // If we have a previous lock that has expired, restart at 1
    if (this.lockUntil && this.lockUntil < Date.now()) {
        return this.updateOne({
            $unset: { lockUntil: 1 },
            $set: { loginAttempts: 1, lastLoginAttempt: Date.now() }
        });
    }
    
    const updates = { 
        $inc: { loginAttempts: 1 },
        $set: { lastLoginAttempt: Date.now() }
    };
    
    // If we have max attempts and no lock, lock the account
    if (this.loginAttempts + 1 >= MAX_LOGIN_ATTEMPTS && !this.isLocked) {
        updates.$set.lockUntil = Date.now() + LOCK_TIME;
    }
    
    return this.updateOne(updates);
};

// Method to reset login attempts on successful login
userSchema.methods.resetLoginAttempts = function() {
    return this.updateOne({
        $unset: { loginAttempts: 1, lockUntil: 1 },
        $set: { lastLoginAttempt: Date.now() }
    });
};

// Static method for login with rate limiting
userSchema.statics.getAuthenticated = async function(email, password) {
    const user = await this.findOne({ emailBusiness: email });
    
    if (!user) {
        return { success: false, message: 'Invalid email or password' };
    }
    
    // Check if account is locked
    if (user.isLocked) {
        await user.incLoginAttempts();
        return { 
            success: false, 
            message: 'Account temporarily locked due to too many failed login attempts. Try again later.' 
        };
    }
    
    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (isMatch) {
        // Reset login attempts on successful login
        if (user.loginAttempts && user.loginAttempts > 0) {
            await user.resetLoginAttempts();
        }
        return { success: true, user };
    } else {
        // Password incorrect, increment login attempts
        await user.incLoginAttempts();
        
        const attemptsLeft = MAX_LOGIN_ATTEMPTS - (user.loginAttempts + 1);
        let message = 'Invalid email or password';
        
        if (attemptsLeft > 0) {
            message += `. ${attemptsLeft} attempts remaining before account lock.`;
        } else {
            message = 'Account locked due to too many failed login attempts. Try again in 2 hours.';
        }
        
        return { success: false, message };
    }
};
userSchema.index({ location: "2dsphere" }, { sparse: true });
const User = mongoose.model("User", userSchema)
module.exports = User