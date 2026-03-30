import knex from 'knex';
import knexConfig from '../../knexfile.js';

const environment = process.env.NODE_ENV || 'development';
const config = (knexConfig as any)[environment];

export const db = knex(config);
