const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    firstname: {
        type: String,
        required: true,
    },
    lastname: {
        type: String,
        required: true,
    },
    middlename: {
        type: String,
        required: false,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    phone: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        required: true,
        enum: ["manager", "client", "engineer", "admin"],
        default: "client",
    },
    isTemporaryPassword: {
        type: Boolean,
        default: false
    },
    status:{
        type: String,
        required: true,
        enum: ["verified", "unverified", "deactivated"]
    },
    resetPasswordToken: String,
    resetPasswordExpires: Date
});

const User = mongoose.model("User", userSchema);

module.exports = User;


