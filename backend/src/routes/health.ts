import { GetCommand } from '@aws-sdk/lib-dynamodb';
import type { FastifyInstance } from 'fastify';
import { docClient } from '../aws';
import { env } from '../env';

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', async () => {
    let db = 'ok';
    try {
      // Touch the store: a probe read is enough to surface engine errors.
      await docClient.send(new GetCommand({
        TableName: env.tableName,
        Key: { pk: 'HEALTH#PROBE', sk: 'PROBE' },
      }));
    } catch {
      db = 'error';
    }
    return {
      status: 'ok',
      db,
      // Lets dev tooling tell which storage engine this backend is on.
      dbEngine: env.dbEngine,
      dbLocal: env.dbEngine === 'sqlite' || Boolean(env.dynamodbEndpoint),
      stripe: process.env.STRIPE_SECRET_KEY ? 'configured' : 'missing',
      timestamp: new Date().toISOString(),
    };
  });
}
