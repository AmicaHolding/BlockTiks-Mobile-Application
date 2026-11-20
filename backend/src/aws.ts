import { env } from './env';
import { SqlDocClient } from './db/engine';

// Minimal doc-client surface used across the codebase (db.ts, scripts,
// health route). Any object with a send(command) that understands the
// DynamoDB DocumentClient command inputs works.
export interface DocClientLike {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  send(command: { input?: Record<string, unknown> } & object): Promise<any>;
}

let current: DocClientLike | undefined;

function dynamoClient(): DocClientLike {
  // Lazy require so the Worker bundle and local SQLite runs never load the
  // AWS SDK. DYNAMODB_ENDPOINT is only for DynamoDB Local.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { DynamoDBClient } = require('@aws-sdk/client-dynamodb') as typeof import('@aws-sdk/client-dynamodb');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb') as typeof import('@aws-sdk/lib-dynamodb');
  const client = new DynamoDBClient({
    region: env.awsRegion,
    ...(env.dynamodbEndpoint ? { endpoint: env.dynamodbEndpoint } : {}),
  });
  return DynamoDBDocumentClient.from(client, {
    marshallOptions: { removeUndefinedValues: true },
  }) as unknown as DocClientLike;
}

function localClient(): DocClientLike {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { openLocalDb } = require('./db/local') as typeof import('./db/local');
  return new SqlDocClient(openLocalDb(env.dbPath));
}

function ensure(): DocClientLike {
  if (!current) current = env.dbEngine === 'dynamo' ? dynamoClient() : localClient();
  return current;
}

// Swap the backing client (used by worker.ts to bind the D1 database, and by
// tests/scripts to point at a scratch file).
export function useDocClient(client: DocClientLike): void {
  current = client;
}

export const docClient: DocClientLike = {
  send: (command) => ensure().send(command),
};
