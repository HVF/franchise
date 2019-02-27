module.exports = {
	host: process.env.PGHOST || 'localhost',
	user: process.env.PGUSER || process.env.USER,
	database: process.env.PGDATABASE || process.env.USER,
	password: process.env.PGPASSWORD,
	port: process.env.PGPORT || 5432
};