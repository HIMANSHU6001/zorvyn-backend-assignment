import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';

const openApiFilePath = path.join(process.cwd(), 'docs', 'openapi.yaml');
const openApiRaw = fs.readFileSync(openApiFilePath, 'utf8');

export const swaggerDocument = parse(openApiRaw);
