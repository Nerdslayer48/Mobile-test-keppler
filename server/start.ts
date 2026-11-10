import './env.ts';
import { connectDatabase } from './db.ts';
import { createApi } from './api.ts';
const connection=connectDatabase();
const app=createApi(connection.db,process.env.TOKEN_ENCRYPTION_KEY??'');
const port=Number(process.env.PORT??3001);
const server=app.listen(port,process.env.HOST??'127.0.0.1',()=>console.log(`Keppler API listening on port ${port}`));
const stop=()=>server.close(()=>{void connection.close().then(()=>process.exit(0));});
process.on('SIGINT',stop);process.on('SIGTERM',stop);
