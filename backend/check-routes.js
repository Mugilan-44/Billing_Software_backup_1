import express from 'express';
import superAdminRoutes from './routes/superAdminRoutes.js';

const app = express();
app.use('/api/super-admin', superAdminRoutes);

const listRoutes = (app) => {
    const routes = [];
    app._router.stack.forEach((middleware) => {
        if (middleware.route) {
            routes.push({
                methods: Object.keys(middleware.route.methods).join(', ').toUpperCase(),
                path: middleware.route.path,
            });
        } else if (middleware.name === 'router') {
            middleware.handle.stack.forEach((handler) => {
                if (handler.route) {
                    const methods = Object.keys(handler.route.methods).join(', ').toUpperCase();
                    // Match the regexp to get the mount path
                    const path = handler.route.path;
                    routes.push({ methods, path: `/api/super-admin${path}` });
                }
            });
        }
    });
    return routes;
};

// We need to trigger a dummy request or access the internal structure differently
// Express router stack is initialized on first use, but app.use() should populate it.
console.log('--- REGISTERED ROUTES ---');
try {
    const routes = listRoutes(app);
    routes.forEach(r => console.log(`${r.methods} ${r.path}`));
} catch (e) {
    console.error(e);
}
process.exit(0);
