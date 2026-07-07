/**
 * Loads the repo-root .env before the rest of a script's import graph
 * evaluates. Must be the FIRST import in tests/*.script.ts files: ESM hoists
 * and evaluates imports in declaration order, so an inline dotenv.config()
 * in the script body runs too late for modules that read process.env at
 * import time (security/encryption.ts throws on a missing
 * SPARKY_FITNESS_API_ENCRYPTION_KEY). Values already present in the shell
 * environment win; dotenv does not overwrite them.
 */
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
