import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Branch from './models/Branch.js';

dotenv.config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/prolync').then(async () => {
    console.log('Connected to MongoDB');
    
    // Find duplicates based on companyId and branchCode
    const branches = await Branch.aggregate([
        {
            $group: {
                _id: { companyId: "$companyId", branchCode: "$branchCode" },
                count: { $sum: 1 },
                docs: { $push: "$_id" }
            }
        },
        {
            $match: {
                count: { $gt: 1 }
            }
        }
    ]);

    for (const group of branches) {
        console.log(`Found ${group.count} branches for Code: ${group._id.branchCode}`);
        // keep the first one, delete the rest
        const toDelete = group.docs.slice(1);
        for (const id of toDelete) {
            await Branch.findByIdAndDelete(id);
            console.log(`Deleted duplicate branch ID: ${id}`);
        }
    }

    console.log('Done cleaning duplicates.');
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
