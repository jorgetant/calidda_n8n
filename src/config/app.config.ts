export type EnvName =
  | 'PORT'
  | 'DB_PORT'
  | 'DB_HOST'
  | 'DB_USER'
  | 'DB_PASS'
  | 'DB'
  | 'JWT_KEY'
  | 'TWILIO_ACCOUNT_SID'
  | 'TWILIO_AUTH_TOKEN'
  | 'TWILIO_PHONE_NUMBER';

export const envConfig = () => ({
  // envs
  PORT: process.env.PORT,

  // database
  DB_PORT: process.env.DB_PORT,
  DB_HOST: process.env.DB_HOST,
  DB_USER: process.env.DB_USER,
  DB_PASS: process.env.DB_PASS,
  DB: process.env.DB,

  // jwt
  JWT_KEY: process.env.JWT_KEY,
});

export default envConfig;
