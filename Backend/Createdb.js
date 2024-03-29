const { Client } = require('pg');

const client = new Client({
  user: 'postgres',
  host: 'localhost',
  password: 'postgres',
  port: 5432,
});

async function createDatabase() {
  try {
    await client.connect(); // Connect to PostgreSQL
    const databaseName = 'shiftmanager';
    // Check if the database exists
    const dbExists = await client.query(`SELECT 1 FROM pg_database WHERE datname='${databaseName}'`);
    if (dbExists.rowCount === 0) {
      // Create the database if it doesn't exist
      await client.query(`CREATE DATABASE "${databaseName}"`);
      console.log(`Database ${databaseName} created successfully.`);
    } else {
      console.log(`Database ${databaseName} already exists.`);
    }
  } catch (error) {
    console.error('Could not connect to postgres', error);
  } finally {
    await client.end(); // Close the connection
  }
}

createDatabase();
