// Workers can't load pino; Fastify only needs this shape when given a custom logger.
const pino: any = () => {
  throw new Error('pino is unavailable in Workers');
};
pino.symbols = { serializersSym: Symbol('pino.serializers') };
pino.stdSerializers = {};
export default pino;
export const symbols = pino.symbols;
export const stdSerializers = pino.stdSerializers;
