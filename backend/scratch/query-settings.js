import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const CompanySettingsSchema = new mongoose.Schema({}, { strict: false });
const CompanySettings = mongoose.model('CompanySettings', CompanySettingsSchema, 'companysettings');

async function test() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');
        const settingsList = await CompanySettings.find().lean();
        console.log('All Settings in DB:');
        console.log(JSON.stringify(settingsList, null, 2));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

test();
