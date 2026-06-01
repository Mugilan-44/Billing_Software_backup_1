import mongoose from 'mongoose';

const connectDB = async () => {
    try {
        const uri = process.env.MONGODB_URI;
        if (!uri) {
            throw new Error('MONGODB_URI environment variable is missing from process.env.');
        }

        // Enforce no localhost fallback
        if (uri.includes('localhost') || uri.includes('127.0.0.1') || uri.includes('://27017')) {
            throw new Error('Security Error: Standalone/Localhost connection URI detected. Only Atlas/replica-set connections are allowed to run transactions.');
        }

        console.log('Connecting to MongoDB database...');
        await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
            family: 4 // Force IPv4
        });

        const connection = mongoose.connection;
        const db = connection.db;
        const host = connection.host;
        const dbName = db.databaseName;

        // Run hello command for transaction support diagnostics
        const helloResult = await db.admin().command({ hello: 1 });

        const setName = helloResult.setName || null;
        const isMaster = helloResult.isWritablePrimary ?? helloResult.ismaster ?? false;
        const topologyType = connection.topology?.description?.type || 'Unknown';
        const transactionSupport = !!setName;

        console.log('\n=================== MONGO CONNECTION DIAGNOSTICS ===================');
        console.log(`* Active DB URI Host:      ${uri.split('@')[1]?.split('/')[0] || 'Masked/SRV'}`);
        console.log(`* Mongoose Connected Host: ${host}`);
        console.log(`* Active Database Name:    ${dbName}`);
        console.log(`* Replica Set (setName):   ${setName || 'NONE (Standalone)'}`);
        console.log(`* Topology Type:           ${topologyType}`);
        console.log(`* Is Writable Primary:     ${isMaster}`);
        console.log(`* Transaction Support:     ${transactionSupport ? 'ENABLED (Replica Set Detected)' : 'DISABLED (No Replica Set)'}`);
        console.log('====================================================================\n');

        if (!transactionSupport) {
            throw new Error(`Connection succeeded, but the database does not support transactions. Replica set Name is missing. Transaction numbers are only allowed on a replica set member or mongos.`);
        }

    } catch (error) {
        console.error(`Error connecting to MongoDB: ${error.message}`);
        throw error; // Throw so that server.js startServer handles the exit
    }
};

export default connectDB;
