require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { app } = require('./app');

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`[server] Arynox_Hotel_ERP backend running on http://localhost:${PORT}`));