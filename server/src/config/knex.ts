import knex from 'knex';
import knexConfig from './knex-config.js';

const environment = process.env.NODE_ENV || 'development';
const config = (knexConfig as any)[environment] || knexConfig.development;

export const db = knex(config);

