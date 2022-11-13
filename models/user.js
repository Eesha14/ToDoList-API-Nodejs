// Load required packages
var mongoose = require('mongoose');

// Define our user schema
var user = new mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    name: { type: String, required: true },
    email: { type: String, required: true },
    pendingTasks: [String],
    dateCreated: { type: Date, default: Date.now }
});

// Export the Mongoose model
module.exports = mongoose.model('users', user);


