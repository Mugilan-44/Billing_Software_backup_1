import fs from 'fs';
import path from 'path';

const controllersDir = '/Users/mugil/Billing-Software backup 1/backend/controllers';

const files = fs.readdirSync(controllersDir).filter(f => f.endsWith('.js'));

for (const file of files) {
    const filePath = path.join(controllersDir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // Replace the exact check: req.user.role === 'ADMIN'
    const updated = content
        .replaceAll("req.user.role === 'ADMIN'", "req.user.role !== 'SUPER_ADMIN'")
        .replaceAll("req.user.role === \"ADMIN\"", "req.user.role !== \"SUPER_ADMIN\"")
        .replaceAll("role === 'ADMIN'", "role !== 'SUPER_ADMIN'")
        .replaceAll("role === \"ADMIN\"", "role !== \"SUPER_ADMIN\"");

    if (content !== updated) {
        fs.writeFileSync(filePath, updated, 'utf8');
        console.log(`Updated tenant isolation in: ${file}`);
    }
}
console.log('Isolation update completed.');
