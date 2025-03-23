const corsAnywhere = require('cors-anywhere');

const host = 'localhost';
const port = 3001;

// Start de CORS-proxyserver
corsAnywhere.createServer({
    originWhitelist: [],  // Sta alle domeinen toe (voor testing)
    requireHeaders: [],    // Geen extra headers nodig
    removeHeaders: ['cookie', 'x-requested-with'],  // Verwijder privacygevoelige headers
}).listen(port, host, () => {
    console.log(`CORS Proxy is running on http://${host}:${port}`);
});
