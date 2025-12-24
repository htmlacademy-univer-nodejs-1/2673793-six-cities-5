import * as crypto from 'node:crypto';
import { ClassConstructor, plainToInstance } from 'class-transformer';
import * as jose from 'jose';
import { DEFAULT_STATIC_IMAGES } from './consts.js';

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '';
}

export const getConnectionString = (
  username: string,
  password: string,
  host: string,
  port: string,
  databaseName: string,
): string => buildMongoUri(username, password, host, port, databaseName);

function buildMongoUri(username: string, password: string, host: string, port: string, databaseName: string): string {
  return `mongodb://${username}:${password}@${host}:${port}/${databaseName}?authSource=admin`;
}

export const createSHA256 = (line: string, salt: string): string => {
  const hmac = createHmacSha256(salt);
  return hmac.update(line).digest('hex');
};

function createHmacSha256(salt: string) {
  return crypto.createHmac('sha256', salt);
}

export function fillDTO<T, V>(someDto: ClassConstructor<T>, plainObject: V) {
  return plainToInstance(someDto, plainObject, { excludeExtraneousValues: true });
}

export function createErrorObject(message: string) {
  return {
    error: message,
  };
}

export async function createJWT(algorithm: string, jwtSecret: string, payload: object): Promise<string> {
  const tokenBuilder = buildJwtToken(algorithm, payload);
  return signToken(tokenBuilder, jwtSecret);
}

function buildJwtToken(algorithm: string, payload: object) {
  return new jose.SignJWT({ ...payload })
    .setProtectedHeader({ alg: algorithm })
    .setIssuedAt()
    .setExpirationTime('2d');
}

async function signToken(tokenBuilder: jose.SignJWT, jwtSecret: string) {
  return tokenBuilder.sign(crypto.createSecretKey(jwtSecret, 'utf-8'));
}

export function getFullServerPath(host: string, port: number) {
  return `http://${host}:${port}`;
}

function isPlainObject(value: unknown): boolean {
  return typeof value === 'object' && value !== null;
}

function processKey(
  property: string,
  key: string,
  someObject: Record<string, unknown>,
  transformFn: (object: Record<string, unknown>) => void
) {
  if (key === property) {
    transformFn(someObject);
  } else if (isPlainObject(someObject[key])) {
    transformProperty(property, someObject[key] as Record<string, unknown>, transformFn);
  }
}

export function transformProperty(
  property: string,
  someObject: Record<string, unknown>,
  transformFn: (object: Record<string, unknown>) => void
) {
  const keys = Object.keys(someObject);
  keys.forEach((key) => processKey(property, key, someObject, transformFn));
}

function shouldUseStatic(value: unknown) {
  return typeof value === 'string' && DEFAULT_STATIC_IMAGES.includes(value);
}

function buildResourcePath(value: unknown, staticPath: string, uploadPath: string) {
  const root = shouldUseStatic(value) ? staticPath : uploadPath;
  return `${root}/${String(value)}`;
}

function applyTransformToTarget(property: string, staticPath: string, uploadPath: string, target: Record<string, unknown>) {
  target[property] = buildResourcePath(target[property], staticPath, uploadPath);
}

export function transformObject(properties: string[], staticPath: string, uploadPath: string, data: Record<string, unknown>) {
  properties.forEach((property) => {
    transformProperty(property, data, (target: Record<string, unknown>) => {
      applyTransformToTarget(property, staticPath, uploadPath, target);
    });
  });
}
