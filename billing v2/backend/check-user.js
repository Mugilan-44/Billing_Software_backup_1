import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

const checkUser = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const user = await User.findOne({ email: 'admin@example.com' });
        if (user) {
            console.log('User found:', user.email, 'Role:', user.role);
        } else {
            console.log('User admin@example.com not found');
            const allUsers = await User.find({}, 'email role');
            console.log('All Users:', allUsers);
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error.message);
    }
};

checkUser();
