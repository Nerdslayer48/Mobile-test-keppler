import express from 'express';
import type { ErrorRequestHandler, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { and, eq, gt, inArray, isNull, ne } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { Database } from './db.ts';
import { boards, companies, datasets, identities, media, sessions } from './schema.ts';
import { checkPassword, digest, hashPassword, randomToken, tokenVault } from './security.ts';

class HttpError extends Error { constructor(public status: number, message: string) { super(message); } }
const text = z.string().trim().min(1).max(200);
const email = z.string().trim().toLowerCase().email().max(320);
const password = z.string().min(8).max(1024);
const picture = z.string().max(1500000).refine(value => !value || /^data:image\/(png|jpeg|webp);base64,/.test(value), 'Choose a valid image.');
const client = z.object({ id: text, name: z.string().max(500), clientType: z.enum(['individual','company']), firstName: z.string(), lastName: z.string(), email: z.string(), phone: z.string(), address: z.string(), otherContact: z.string(), companyName: z.string(), companyAddress: z.string(), hotline: z.string(), profilePicture: picture.optional() });
const project = z.object({ id: text, clientId: text, name: text, categories: z.array(text).min(1).max(100) });
const mediaRef = z.object({ mediaId: text, type: z.string().max(150) });
const nestedMedia = z.object({ id: text, name: z.string().max(500), kind: z.enum(['image','video']), file: mediaRef });
const boardItem = z.object({ id: text, name: z.string().max(500), kind: z.enum(['image','video','rectangle','ellipse','line','text','section']), file: mediaRef.optional(), x: z.number().finite(), y: z.number().finite(), width: z.number().positive().optional(), height: z.number().positive().optional(), text: z.string().max(100000).optional(), title: z.string().max(1000).optional(), flipLine: z.boolean().optional(), connections: z.array(text).max(10000).optional(), connectionPorts: z.record(z.string(), z.object({ source: z.enum(['top','right','bottom','left']), target: z.enum(['top','right','bottom','left']) })).optional(), inputs: z.array(z.object({ id: text, text: z.string().max(100000), width: z.number().positive().optional(), height: z.number().positive().optional(), media: z.array(nestedMedia).max(1000).optional() })).max(10000).optional() });
type Identity = typeof identities.$inferSelect;
type Session = typeof sessions.$inferSelect;
type Auth = { identity: Identity; session: Session };
const owner = (auth: Auth) => { if (auth.identity.kind !== 'owner') throw new HttpError(403, 'Company owner access required.'); };
const publicCompany = (company: typeof companies.$inferSelect, identity: Identity) => ({ id: company.id, companyName: company.companyName, companyEmail: identity.email, createdAt: company.createdAt.toISOString() });

export function createApi(db: Database, encryptionKey: string) {
  const vault = tokenVault(encryptionKey);
  const app = express(); app.disable('x-powered-by');
  app.use(helmet());
  const origins = new Set((process.env.ALLOWED_ORIGINS ?? 'http://127.0.0.1:5173,http://localhost:5173,null').split(','));
  app.use(cors({ origin: (origin, callback) => callback(null, !origin || origins.has(origin)), exposedHeaders: ['X-Media-Type'] }));
  app.use((_req, res, next) => { res.setHeader('Cache-Control','no-store'); next(); });
  app.use(express.json({ limit: '20mb' }));
  app.use('/api/auth', rateLimit({ windowMs: 15 * 60000, limit: 100, standardHeaders: 'draft-8', legacyHeaders: false }));
  const authenticate = async (req: Request, res: Response, next: NextFunction) => {
    const token = req.get('Authorization')?.replace(/^Bearer /, '');
    if (!token || !/^[a-f0-9]{64}$/i.test(token)) throw new HttpError(401, 'Sign in to continue.');
    const [found] = await db.select({ identity: identities, session: sessions }).from(sessions).innerJoin(identities, and(eq(identities.id, sessions.identityId), eq(identities.companyId, sessions.companyId))).where(and(eq(sessions.tokenHash, digest(token)), gt(sessions.expiresAt, new Date()),isNull(identities.accessRevokedAt)));
    if (!found) throw new HttpError(401, 'Session expired. Sign in again.');
    res.locals.auth = found; next();
  };
  const authOf = (res: Response) => res.locals.auth as Auth;
  async function payload(auth: Auth) {
    const [company] = await db.select().from(companies).where(eq(companies.id, auth.identity.companyId));
    const [account] = await db.select().from(identities).where(and(eq(identities.companyId, company.id), eq(identities.kind,'owner')));
    const records = await db.select().from(datasets).where(eq(datasets.companyId, company.id));
    return { company: publicCompany(company, account), session: { id: auth.session.tokenHash, companyId: company.id, staffId: auth.identity.kind === 'staff' ? auth.identity.id : undefined, authenticatedAt: auth.session.authenticatedAt.getTime(), expiresAt: auth.session.expiresAt.getTime() }, datasets: records };
  }
  async function issue(identity: Identity) {
    const token = randomToken();
    const session = await db.transaction(async tx => {
      const [latest] = await tx.select().from(identities).where(eq(identities.id,identity.id)).for('update');
      if(!latest || latest.accessRevokedAt || latest.passwordHash!==identity.passwordHash || latest.tokenHash!==identity.tokenHash)throw new HttpError(401,'Credentials changed. Sign in again.');
      const [session] = await tx.insert(sessions).values({ tokenHash: digest(token), companyId: identity.companyId, identityId: identity.id, expiresAt: new Date(Date.now() + 7 * 86400000) }).returning();return session;
    });
    return { ...await payload({ identity, session }), token };
  }
  function staffView(identity: Identity, reveal: boolean) {
    return { id: identity.id, companyId: identity.companyId, name: identity.name, email: identity.email, role: identity.role, profilePicture: identity.profilePicture, createdAt: identity.createdAt.toISOString(), accessRevoked: !!identity.accessRevokedAt, ...(reveal && !identity.accessRevokedAt ? { accessToken: vault.decrypt(identity.tokenCipher!) } : {}) };
  }
  app.get('/api/ready', (_req, res) => { res.json({ status: 'ready' }); });
  app.get('/api/health', async (_req, res) => { await db.select({ id: companies.id }).from(companies).limit(1); res.json({ status:'ok', database:'neon-postgres' }); });
  app.post('/api/auth/signup', async (req, res) => {
    const input = z.object({ companyName: text, companyEmail: email, password }).parse(req.body);
    const passwordHash = await hashPassword(input.password);
    const identity = await db.transaction(async tx => {
      const [company] = await tx.insert(companies).values({ id: randomUUID(), companyName: input.companyName }).returning();
      const [identity] = await tx.insert(identities).values({ id: randomUUID(), companyId: company.id, kind:'owner', name: input.companyName, email: input.companyEmail, passwordHash }).returning();
      return identity;
    });
    res.status(201).json(await issue(identity));
  });
  app.post('/api/auth/login', async (req, res) => {
    const input = z.object({ companyEmail: email, password: z.string().min(1).max(1024) }).parse(req.body);
    const [identity] = await db.select().from(identities).where(and(eq(identities.email,input.companyEmail), eq(identities.kind,'owner')));
    if (!identity || !await checkPassword(input.password, identity.passwordHash)) throw new HttpError(401, 'Company email or password is incorrect.');
    res.json(await issue(identity));
  });
  app.post('/api/auth/staff', async (req, res) => {
    const input = z.object({ email, accessToken: z.string().trim().min(1).max(256) }).parse(req.body);
    const [identity] = await db.select().from(identities).where(and(eq(identities.email,input.email), eq(identities.kind,'staff'), eq(identities.tokenHash,digest(input.accessToken)),isNull(identities.accessRevokedAt)));
    if (!identity) throw new HttpError(401, 'Staff email or access token is incorrect.');
    res.json(await issue(identity));
  });
  app.use('/api', authenticate);
  app.get('/api/me', async (_req, res) => res.json(await payload(authOf(res))));
  app.post('/api/auth/logout', async (req, res) => {
    const auth = authOf(res); const all = req.body?.all === true;
    if (all) owner(auth);
    await db.delete(sessions).where(all ? eq(sessions.companyId,auth.identity.companyId) : eq(sessions.tokenHash,auth.session.tokenHash));
    res.json({ ok:true });
  });
  app.patch('/api/company', async (req, res) => {
    const auth = authOf(res); owner(auth);
    const input = z.object({ companyName: text.optional(), companyEmail: email.optional(), currentPassword: z.string().max(1024).optional(), password: password.optional() }).parse(req.body);
    if (input.password && !await checkPassword(input.currentPassword ?? '',auth.identity.passwordHash)) throw new HttpError(400,'Current password is incorrect.');
    const passwordHash = input.password ? await hashPassword(input.password) : auth.identity.passwordHash;
    await db.transaction(async tx => {
      const [latest]=await tx.select().from(identities).where(eq(identities.id,auth.identity.id)).for('update');
      if(!latest || latest.passwordHash!==auth.identity.passwordHash)throw new HttpError(409,'Credentials changed. Sign in again.');
      if(input.companyName) await tx.update(companies).set({ companyName: input.companyName }).where(eq(companies.id,auth.identity.companyId));
      await tx.update(identities).set({ email:input.companyEmail ?? auth.identity.email, passwordHash }).where(eq(identities.id,auth.identity.id));
      if (input.password) await tx.delete(sessions).where(and(eq(sessions.companyId,auth.identity.companyId),ne(sessions.tokenHash,auth.session.tokenHash)));
    });
    const [identity] = await db.select().from(identities).where(eq(identities.id,auth.identity.id));
    res.json(await payload({ ...auth, identity }));
  });
  app.get('/api/staff', async (_req, res) => {
    const auth=authOf(res); const list=await db.select().from(identities).where(and(eq(identities.companyId,auth.identity.companyId),eq(identities.kind,'staff')));
    res.json(list.map(member=>staffView(member,auth.identity.kind==='owner')));
  });
  app.post('/api/staff', async (req,res) => {
    const auth=authOf(res); owner(auth); const input=z.object({ name:text,email,role:z.string().trim().max(200) }).parse(req.body); const token=randomToken();
    const [identity]=await db.insert(identities).values({ ...input,id:randomUUID(),companyId:auth.identity.companyId,kind:'staff',tokenHash:digest(token),tokenCipher:vault.encrypt(token) }).returning();
    res.status(201).json(staffView(identity,true));
  });
  app.post('/api/staff/:id/access', async (req,res) => {
    const auth=authOf(res); owner(auth); const id=text.parse(req.params.id);
    const {revoked}=z.object({revoked:z.boolean()}).strict().parse(req.body);
    const member=await db.transaction(async tx=>{
      const where=and(eq(identities.id,id),eq(identities.companyId,auth.identity.companyId),eq(identities.kind,'staff'));
      const [current]=await tx.select().from(identities).where(where).for('update');
      if(!current)throw new HttpError(404,'Staff member not found.');
      // Restoring access issues a fresh token so a previously revoked token stays invalid.
      const token=!revoked && current.accessRevokedAt ? randomToken() : null;
      const [updated]=await tx.update(identities).set({accessRevokedAt:revoked?new Date():null,...(token?{tokenHash:digest(token),tokenCipher:vault.encrypt(token)}:{})}).where(where).returning();
      if(revoked || token)await tx.delete(sessions).where(and(eq(sessions.identityId,id),eq(sessions.companyId,auth.identity.companyId)));
      return updated;
    });
    res.json(staffView(member,true));
  });
  app.delete('/api/staff/:id', async (req,res) => {
    const auth=authOf(res); owner(auth); const id=text.parse(req.params.id);
    // The identity/session foreign key cascades, invalidating every staff session atomically.
    const removed=await db.delete(identities).where(and(eq(identities.id,id),eq(identities.companyId,auth.identity.companyId),eq(identities.kind,'staff'))).returning({id:identities.id});
    if(!removed.length)throw new HttpError(404,'Staff member not found.');
    res.json({ok:true});
  });
  app.get('/api/staff/profile', (_req,res) => { const auth=authOf(res); if(auth.identity.kind!=='staff') throw new HttpError(403,'Staff access required.'); res.json(staffView(auth.identity,false)); });
  app.put('/api/staff/profile',async(req,res)=>{
    const auth=authOf(res); if(auth.identity.kind!=='staff') throw new HttpError(403,'Staff access required.');
    const input=z.object({name:text.optional(),email:email.optional(),profilePicture:picture.optional()}).strict().refine(value=>Object.keys(value).length>0,'Enter a profile change.').parse(req.body);
    const [identity]=await db.update(identities).set(input).where(and(eq(identities.id,auth.identity.id),eq(identities.companyId,auth.identity.companyId),isNull(identities.accessRevokedAt))).returning();
    if(!identity)throw new HttpError(401,'Staff access has been revoked.');res.json(staffView(identity,false));
  });
  app.put('/api/data/:key',async(req,res)=>{
    const auth=authOf(res);const key=z.string().max(300).parse(req.params.key);const input=z.object({version:z.number().int().nonnegative(),value:z.unknown()}).parse(req.body);
    let value: unknown[];
    if(key==='keppler.clients') value=z.array(client).max(10000).parse(input.value).map(item=>({...item,companyId:auth.identity.companyId}));
    else if(key.startsWith('projects.')) {
      const clientId=key.slice(9);const [list]=await db.select().from(datasets).where(and(eq(datasets.companyId,auth.identity.companyId),eq(datasets.key,'keppler.clients')));
      if(!list?.value.some(item=>(item as {id:string}).id===clientId)) throw new HttpError(404,'Client not found.');
      value=z.array(project).max(10000).parse(input.value).map(item=>{if(item.clientId!==clientId)throw new HttpError(400,'Invalid project client.');return {...item,companyId:auth.identity.companyId};});
    } else throw new HttpError(400,'Unknown data collection.');
    const where=and(eq(datasets.companyId,auth.identity.companyId),eq(datasets.key,key));
    const saved=input.version===0 ? await db.insert(datasets).values({companyId:auth.identity.companyId,key,value}).onConflictDoNothing().returning()
      : await db.update(datasets).set({value,version:input.version+1}).where(and(where,eq(datasets.version,input.version))).returning();
    if(!saved.length)throw new HttpError(409,'This data changed on another device. Reload before saving again.');res.json(saved[0]);
  });
  app.get('/api/boards/:key',async(req,res)=>{const auth=authOf(res);const key=z.string().max(1000).parse(req.params.key);const [record]=await db.select().from(boards).where(and(eq(boards.companyId,auth.identity.companyId),eq(boards.key,key)));res.json(record??{value:[],version:0});});
  app.put('/api/boards/:key',async(req,res)=>{
    const auth=authOf(res);const key=z.string().max(1000).parse(req.params.key);const input=z.object({version:z.number().int().nonnegative(),value:z.array(boardItem).max(10000)}).parse(req.body);
    const refs=[...new Set(input.value.flatMap(item=>[...(item.file?[item.file.mediaId]:[]),...(item.inputs??[]).flatMap(input=>(input.media??[]).map(media=>media.file.mediaId))]))];
    if(refs.length){const owned=await db.select({id:media.id}).from(media).where(and(eq(media.companyId,auth.identity.companyId),inArray(media.id,refs)));if(owned.length!==refs.length)throw new HttpError(403,'Media does not belong to this company.');}
    const value=input.value.map(item=>({...item,companyId:auth.identity.companyId}));const where=and(eq(boards.companyId,auth.identity.companyId),eq(boards.key,key));
    const saved=input.version===0?await db.insert(boards).values({companyId:auth.identity.companyId,key,value}).onConflictDoNothing().returning():await db.update(boards).set({value,version:input.version+1}).where(and(where,eq(boards.version,input.version))).returning();
    if(!saved.length)throw new HttpError(409,'This board changed on another device. Reopen it before saving.');res.json({version:saved[0].version});
  });
  app.post('/api/media',express.raw({type:'application/octet-stream',limit:'64mb'}),async(req,res)=>{
    const auth=authOf(res);const mimeType=z.string().regex(/^(image|video)\/[a-zA-Z0-9.+-]+$/).max(150).parse(req.query.type);
    if(!Buffer.isBuffer(req.body)||!req.body.length)throw new HttpError(400,'Choose an image or video.');
    const hash=digest(req.body);const value={id:randomUUID(),companyId:auth.identity.companyId,digest:hash,mimeType,content:req.body};
    await db.insert(media).values(value).onConflictDoNothing();const [record]=await db.select({id:media.id}).from(media).where(and(eq(media.companyId,auth.identity.companyId),eq(media.digest,hash)));res.status(201).json({mediaId:record.id,type:mimeType});
  });
  app.get('/api/media/:id',async(req,res)=>{const auth=authOf(res);const [record]=await db.select().from(media).where(and(eq(media.companyId,auth.identity.companyId),eq(media.id,z.string().parse(req.params.id))));if(!record)throw new HttpError(404,'Media not found.');res.type('application/octet-stream').set('X-Media-Type',record.mimeType).send(record.content);});
  app.use((_req,_res,next)=>next(new HttpError(404,'Not found.')));
  const errorHandler:ErrorRequestHandler=(error,_req,res,_next)=>{
    void _next;
    if(error instanceof z.ZodError){res.status(400).json({error:error.issues[0]?.message??'Invalid input.'});return;}
    if(error instanceof HttpError){res.status(error.status).json({error:error.message});return;}
    const code=error?.code??error?.cause?.code;
    if(code==='23505'){res.status(409).json({error:'This email or credential already exists.'});return;}
    if(error?.type==='entity.too.large'){res.status(413).json({error:'Upload is too large.'});return;}
    console.error('API request failed:',error instanceof Error?error.name:'unknown error');res.status(500).json({error:'Unable to complete the request. Please try again.'});
  };
  app.use(errorHandler);return app;
}
