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
      '/auth/refresh': { post: { summary: 'Refresh JWT session', tags: ['Auth'] } },
      '/profile': {
        get: { summary: 'Get or create profile', tags: ['Profile'] },
        put: { summary: 'Update profile', tags: ['Profile'] },
      },
      '/profile/avatar/upload-url': {
        post: {
          summary: 'Get signed upload URL for profile picture',
          description: 'Returns { path, token } for Supabase Storage (bucket profile-pictures)',
          tags: ['Profile'],
        },
      },
      '/profile/avatar-url': {
        get: {
          summary: 'Get signed URL to display profile picture',
          description: 'Returns { url, expiresIn } for private bucket, or { url: null } if none',
          tags: ['Profile'],
        },
      },
      '/transactions': {
        get: { summary: 'List transactions', tags: ['Transactions'] },
        post: { summary: 'Create transaction (income/expense/transfer)', tags: ['Transactions'] },
      },
      '/accounts': {
        get: { summary: 'List accounts', tags: ['Accounts'] },
        post: { summary: 'Create account', tags: ['Accounts'] },
      },
      '/categories': {
        get: { summary: 'List categories', tags: ['Categories'] },
        post: { summary: 'Create category', tags: ['Categories'] },
      },
      '/credit-card/statement/{accountId}': {
        get: { summary: 'Get credit card statement', tags: ['Credit Cards'] },
      },
      '/credit-card/statement/{accountId}/pay': {
        post: { summary: 'Pay credit card statement', tags: ['Credit Cards'] },
      },
      '/credit-card/msi/{installmentId}/pay': {
        post: { summary: 'Pay MSI installment', tags: ['Credit Cards'] },
      },
      '/installments': {
        get: { summary: 'List installment purchases', tags: ['Installments'] },
        post: { summary: 'Create installment purchase', tags: ['Installments'] },
      },
      '/installments/{id}': { get: { summary: 'Get installment purchase', tags: ['Installments'] } },
      '/installments/{id}/pay': { post: { summary: 'Pay installment', tags: ['Installments'] } },
      '/investments': {
        get: { summary: 'List investments', tags: ['Investments'] },
        post: { summary: 'Create investment', tags: ['Investments'] },
      },
      '/investments/refresh-prices': {
        post: { summary: 'Refresh crypto prices from CoinGecko', tags: ['Investments'] },
      },
      '/investments/{id}': {
        get: { summary: 'Get investment', tags: ['Investments'] },
        put: { summary: 'Update investment', tags: ['Investments'] },
        delete: { summary: 'Delete investment', tags: ['Investments'] },
      },
      '/recurring': {
        get: { summary: 'List recurring transactions', tags: ['Recurring'] },
        post: { summary: 'Create recurring transaction', tags: ['Recurring'] },
      },
      '/recurring/{id}': {
        get: { summary: 'Get recurring', tags: ['Recurring'] },
        put: { summary: 'Update recurring', tags: ['Recurring'] },
        delete: { summary: 'Delete recurring', tags: ['Recurring'] },
      },
      '/recurring/{id}/pay': { post: { summary: 'Execute recurring payment', tags: ['Recurring'] } },
      '/recurring/{id}/skip': { post: { summary: 'Skip recurring without paying', tags: ['Recurring'] } },
      '/financial-planning/summary': { get: { summary: 'Period summary', tags: ['Financial Planning'] } },
      '/financial-planning/upcoming': { get: { summary: 'Upcoming commitments', tags: ['Financial Planning'] } },
      '/notifications': {
        get: { summary: 'List notifications', tags: ['Notifications'] },
      },
      '/notifications/{id}/read': { put: { summary: 'Mark notification as read', tags: ['Notifications'] } },
      '/notifications/read-all': { put: { summary: 'Mark all as read', tags: ['Notifications'] } },
      '/loans': {
        get: { summary: 'List loans', tags: ['Loans'] },
        post: { summary: 'Create loan', tags: ['Loans'] },
      },
      '/goals': {
        get: { summary: 'List savings goals', tags: ['Goals'] },
        post: { summary: 'Create goal', tags: ['Goals'] },
      },
    },
  },
  apis: [],
};

const spec = swaggerJsdoc(options);

export function setupSwagger(app: Express): void {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(spec));
}
