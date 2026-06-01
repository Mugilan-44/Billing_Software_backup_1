import fs from 'fs';
import path from 'path';

const srcDir = '/Users/mugil/Desktop/Billing_Software_backup_1/frontend/src';

function walkDir(currentPath) {
    const files = fs.readdirSync(currentPath);
    for (const file of files) {
        const fullPath = path.join(currentPath, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            walkDir(fullPath);
        } else if (stat.isFile() && (file.endsWith('.js') || file.endsWith('.jsx'))) {
            processFile(fullPath);
        }
    }
}

function processFile(filePath) {
    if (filePath.endsWith('utils/api.js')) return; // Skip the api config itself

    let content = fs.readFileSync(filePath, 'utf8');
    if (content.includes("import axios from 'axios'")) {
        // Calculate relative path to src/utils/api
        const relativeDir = path.relative(path.dirname(filePath), path.join(srcDir, 'utils'));
        let apiPath = path.join(relativeDir, 'api').replace(/\\/g, '/');
        if (!apiPath.startsWith('.') && !apiPath.startsWith('/')) {
            apiPath = './' + apiPath;
        }

        console.log(`Refactoring ${path.relative(srcDir, filePath)} -> importing from ${apiPath}`);
        
        // Replace the import
        content = content.replace(
            /import axios from 'axios';/g,
            `import axios from '${apiPath}';`
        );
        
        fs.writeFileSync(filePath, content, 'utf8');
    }
}

walkDir(srcDir);
console.log('Refactoring complete!');
