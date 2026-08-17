export default () => ({
  port: parseInt(process.env.PORT || "3000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  appUrl: process.env.APP_URL || "http://localhost:3000",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3001",
  database: {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432", 10),
    name: process.env.DB_NAME || "whatsapp_platform",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "postgres123",
    sync: process.env.DB_SYNC === "true",
    logging: process.env.DB_LOGGING === "true",
  },
  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
    password: process.env.REDIS_PASSWORD || "",
  },
  jwt: {
    accessSecret:
      process.env.JWT_ACCESS_SECRET ||
      "dev_access_secret_change_me_min_32_chars",
    accessExpires: process.env.JWT_ACCESS_EXPIRES || "15m",
    refreshSecret:
      process.env.JWT_REFRESH_SECRET ||
      "dev_refresh_secret_change_me_min_32_chars",
    refreshExpires: process.env.JWT_REFRESH_EXPIRES || "30d",
  },
  meta: {
    appId: process.env.META_APP_ID || "",
    appSecret: process.env.META_APP_SECRET || "",
    verifyToken: process.env.META_VERIFY_TOKEN || "",
    apiVersion: process.env.META_API_VERSION || "v20.0",
  },
  ai: {
    provider: process.env.AI_PROVIDER || "anthropic",
    apiKey: process.env.AI_API_KEY || "",
    model: process.env.AI_MODEL || "",
  },
  embedding: {
    provider: process.env.EMBEDDING_PROVIDER || "openai",
    apiKey: process.env.EMBEDDING_API_KEY || "",
    model: process.env.EMBEDDING_MODEL || "text-embedding-3-small",
  },
  minio: {
    endpoint: process.env.MINIO_ENDPOINT || "localhost",
    port: parseInt(process.env.MINIO_PORT || "9000", 10),
    useSSL: process.env.MINIO_USE_SSL === "true",
    accessKey: process.env.MINIO_ACCESS_KEY || "minioadmin",
    secretKey: process.env.MINIO_SECRET_KEY || "minioadmin123",
    bucket: process.env.MINIO_BUCKET || "whatsapp-media",
  },
});
