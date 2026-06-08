import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

console.log('MONGODB_URI:', process.env.MONGODB_URI);

const checkUser = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB Successfully');

        // Check all users
        console.log('Fetching all users...');
        const allUsers = await User.find({}).select('+password');
        console.log('Total Users Found:', allUsers.length);

        for (const user of allUsers) {
            console.log(`- Email: ${user.email}, Role: ${user.role}, Active: ${user.isActive}`);
            // Test password 'password123' if it matches
            try {
                const isMatch = await user.matchPassword('password123');
                console.log(`  Password 'password123' match: ${isMatch}`);
            } catch (pwdErr) {
                console.error(`  Error matching password for ${user.email}:`, pwdErr.message);
            }
        }

        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    } catch (error) {
        console.error('Critical Error in checkUser:', error.message);
        if (error.stack) console.error(error.stack);
    }
};

checkUser().then(() => console.log('Script finished execution'));
