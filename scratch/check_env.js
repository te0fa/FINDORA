console.log('DATABASE_URL:', process.env.DATABASE_URL);
console.log('PGUSER:', process.env.PGUSER || process.env.POSTGRES_USER);
console.log('PGPASSWORD:', process.env.PGPASSWORD ? 'exists' : 'missing');
