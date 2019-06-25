module.exports = {
    host: process.env.PGHOST || 'localhost',
    user: process.env.PGUSER || 'postgres',
    database: process.env.PGDATABASE || 'postgres',
    password: process.env.PGPASSWORD,
    port: process.env.PGPORT || 5432,
}
