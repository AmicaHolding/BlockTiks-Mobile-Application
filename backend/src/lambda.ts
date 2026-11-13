import awsLambdaFastify from '@fastify/aws-lambda';
import { buildApp } from './app';

// API Gateway HTTP API (payload format 2.0) → Fastify.
// API Gateway passes application/json bodies through unchanged, so the
// rawBody captured in app.ts stays byte-exact for Stripe webhook signatures.
export const handler = awsLambdaFastify(buildApp());
