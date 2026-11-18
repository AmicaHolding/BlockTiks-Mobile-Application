// Table lifecycle for local/staging data scripts. Schema mirrors
// BlockTiksTable in template.yaml, keep the two in sync.
import {
  CreateTableCommand,
  DescribeTableCommand,
  DynamoDBClient,
  ResourceNotFoundException,
  waitUntilTableExists,
  type CreateTableCommandInput,
} from '@aws-sdk/client-dynamodb';
import { env } from '../src/env';

export const client = new DynamoDBClient({
  region: env.awsRegion,
  ...(env.dynamodbEndpoint ? { endpoint: env.dynamodbEndpoint } : {}),
});

const gsi = (name: string) => ({
  IndexName: name,
  KeySchema: [
    { AttributeName: `${name}pk`, KeyType: 'HASH' as const },
    { AttributeName: `${name}sk`, KeyType: 'RANGE' as const },
  ],
  Projection: { ProjectionType: 'ALL' as const },
});

export const tableDefinition = (TableName: string): CreateTableCommandInput => ({
  TableName,
  BillingMode: 'PAY_PER_REQUEST',
  AttributeDefinitions: ['pk', 'sk', 'gsi1pk', 'gsi1sk', 'gsi2pk', 'gsi2sk'].map((AttributeName) => ({
    AttributeName,
    AttributeType: 'S' as const,
  })),
  KeySchema: [
    { AttributeName: 'pk', KeyType: 'HASH' },
    { AttributeName: 'sk', KeyType: 'RANGE' },
  ],
  GlobalSecondaryIndexes: [gsi('gsi1'), gsi('gsi2')],
});

export const isLocal = () => Boolean(env.dynamodbEndpoint);

export function target(): string {
  return isLocal() ? `${env.tableName} @ ${env.dynamodbEndpoint}` : `${env.tableName} @ AWS ${env.awsRegion}`;
}

export async function tableExists(): Promise<boolean> {
  try {
    await client.send(new DescribeTableCommand({ TableName: env.tableName }));
    return true;
  } catch (e) {
    if (e instanceof ResourceNotFoundException) return false;
    throw e;
  }
}

export async function ensureTable(): Promise<'created' | 'exists'> {
  if (await tableExists()) return 'exists';
  await client.send(new CreateTableCommand(tableDefinition(env.tableName)));
  await waitUntilTableExists({ client, maxWaitTime: 120 }, { TableName: env.tableName });
  return 'created';
}
