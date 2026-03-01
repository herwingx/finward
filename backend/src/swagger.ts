import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: { title: 'Finward API', version: '1.0.0', description: 'API de finanzas personales B2C' },
    servers: [{ url: '/api', description: 'API Base' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
    security: [{ bearerAuth: [] }],
    paths: {
      '/transactions': {
        get: { summary: 'List transactions', tags: ['Transactions'] },
        post: { summary: 'Create transaction', tags: ['Transactions'] },
      },
      '/accounts': {
        get: { summary: 'List accounts', tags: ['Accounts'] },
        post: { summary: 'Create account', tags: ['Accounts'] },
      },
      '/categories': {
        get: { summary: 'List categories', tags: ['Categories'] },
        post: { summary: 'Create category', tags: ['Categories'] },
      },
    },
  },
  apis: [],
};

const spec = swaggerJsdoc(options);

export function setupSwagger(app: Express): void {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(spec));
}
