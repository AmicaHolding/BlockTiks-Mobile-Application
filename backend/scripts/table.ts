// Schema lifecycle for local/staging data scripts. Default engine is SQLite
// (same single-table document schema as Cloudflare D1); DB_ENGINE=dynamo
// keeps the legacy DynamoDB path for the AWS/SAM deployment.
import { env } from '../src/env';
import { SCHEMA_SQL } from '../src/db/store';

export const isLocal = () => env.dbEngine === 'sqlite' || Boolean(env.dynamodbEndpoint);

export function target(): string {
  return env.dbEngine === 'dynamo'
    ? (env.dynamodbEndpoint
        ? `${env.tableName} @ ${env.dynamodbEndpoint}`
        : `${env.tableName} @ AWS ${env.awsRegion}`)
    : `${env.dbPath} (sqlite / D1 dialect)`;
}

export async function ensureTable(): Promise<'created' | 'exists'> {
  if (env.dbEngine !== 'dynamo') {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { openLocalDb } = require('../src/db/local') as typeof import('../src/db/local');
    await openLocalDb(env.dbPath).exec(SCHEMA_SQL);
    return 'exists';
  }
  // Legacy DynamoDB path.
  const {
    CreateTableCommand, DescribeTableCommand, DynamoDBClient,
    ResourceNotFoundException, waitUntilTableExists,
    // eslint-disable-next-line @typescript-eslint/no-var-requires
  } = require('@aws-sdk/client-dynamodb') as typeof import('@aws-sdk/client-dynamodb');
  const client = new DynamoDBClient({
    region: env.awsRegion,
    ...(env.dynamodbEndpoint ? { endpoint: env.dynamodbEndpoint } : {}),
  });
  try {
    await client.send(new DescribeTableCommand({ TableName: env.tableName }));
    return 'exists';
  } catch (e) {
    if (!(e instanceof ResourceNotFoundException)) throw e;
  }
  const gsi = (name: string) => ({
    IndexName: name,
    KeySchema: [
      { AttributeName: `${name}pk`, KeyType: 'HASH' as const },
      { AttributeName: `${name}sk`, KeyType: 'RANGE' as const },
    ],
    Projection: { ProjectionType: 'ALL' as const },
  });
  await client.send(new CreateTableCommand({
    TableName: env.tableName,
    BillingMode: 'PAY_PER_REQUEST',
    AttributeDefinitions: ['pk', 'sk', 'gsi1pk', 'gsi1sk', 'gsi2pk', 'gsi2sk'].map((AttributeName) => ({
      AttributeName, AttributeType: 'S' as const,
    })),
    KeySchema: [
      { AttributeName: 'pk', KeyType: 'HASH' },
      { AttributeName: 'sk', KeyType: 'RANGE' },
    ],
    GlobalSecondaryIndexes: [gsi('gsi1'), gsi('gsi2')],
  }));
  await waitUntilTableExists({ client, maxWaitTime: 120 }, { TableName: env.tableName });
  return 'created';
}
