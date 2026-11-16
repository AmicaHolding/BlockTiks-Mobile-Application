import { DescribeTableCommand, DynamoDBClient } from '@aws-sdk/client-dynamodb';
import type { FastifyInstance } from 'fastify';
import { env } from '../env';

const ddb = new DynamoDBClient({
  region: env.awsRegion,
  ...(env.dynamodbEndpoint ? { endpoint: env.dynamodbEndpoint } : {}),
});

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', async () => {
    let db = 'ok';
    try {
      await ddb.send(new DescribeTableCommand({ TableName: env.tableName }));
    } catch {
      db = 'error';
    }
    return {
      status: 'ok',
      db,
      stripe: process.env.STRIPE_SECRET_KEY ? 'configured' : 'missing',
      timestamp: new Date().toISOString(),
    };
  });
}
