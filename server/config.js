import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from project root
dotenv.config({ path: resolve(__dirname, '..', '.env') });

export default {
  port: process.env.PORT || 3001,
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'broadband_lookup',
    user: process.env.DB_USER || process.env.USER || 'yugeshchandraroy',
    password: process.env.DB_PASSWORD || '',
    max: 20,          // max pool size
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  },
  googleMapsApiKey: process.env.VITE_GOOGLE_MAPS_API_KEY,
  coveredStates: {
    '06': 'California',
    '13': 'Georgia',
    '17': 'Illinois',
    '36': 'New York',
    '48': 'Texas',
  },
  coveredStateAbbreviations: ['CA', 'GA', 'IL', 'NY', 'TX'],
  mongoUri: process.env.MONGODB_URI || null,
};
