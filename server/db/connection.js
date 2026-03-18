import pg from 'pg';
import config from '../config.js';

const { Pool } = pg;

const pool = new Pool(config.db);

pool.on('connect', () => {
  console.log('[DB] Connected to PostgreSQL - broadband_lookup');
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected pool error:', err.message);
});

/**
 * Test the database connection
 * @returns {Promise<boolean>}
 */
export const testConnection = async () => {
  try {
    const result = await pool.query('SELECT COUNT(*) FROM block_availability');
    console.log(`[DB] Connection verified. ${result.rows[0].count} records in block_availability.`);
    return true;
  } catch (err) {
    console.error('[DB] Connection test failed:', err.message);
    return false;
  }
};

export default pool;
