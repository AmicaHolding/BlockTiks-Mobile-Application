import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { env } from './env';

// DYNAMODB_ENDPOINT is only for DynamoDB Local (e.g. http://localhost:8000).
// On Lambda / real AWS, leave unset and the SDK uses the runtime region/creds.
const client = new DynamoDBClient({
  region: env.awsRegion,
  ...(env.dynamodbEndpoint ? { endpoint: env.dynamodbEndpoint } : {}),
});

export const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});
