import { connectDatabase } from './db.ts';
import { createFetchApi } from './fetch.ts';

const connection = connectDatabase();
const fetch = createFetchApi(connection.db, process.env.TOKEN_ENCRYPTION_KEY ?? '');
export default { fetch };
