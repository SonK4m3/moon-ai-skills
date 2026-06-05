import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function printUsage() {
  console.log(`
Usage: npx tsx validate-summary.ts [options]

Options:
  -i, --input <path>     Path to the summary.json file to validate. (Required)
  -h, --help             Show this help message.
`);
}

function parseArgs() {
  const args = process.argv.slice(2);
  let input: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '-h' || arg === '--help') {
      printUsage();
      process.exit(0);
    } else if (arg === '-i' || arg === '--input') {
      input = args[++i];
    }
  }

  if (!input) {
    console.error('Error: --input is required.');
    printUsage();
    process.exit(1);
  }

  return { input };
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates a parsed JSON object against the conversation summary schema.
 * Reusable by other scripts (e.g., render-html.ts).
 */
export function validateSummary(data: unknown): ValidationResult {
  const schemaPath = path.join(__dirname, '..', 'summary.schema.json');
  const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
  const schema = JSON.parse(schemaContent);

  const ajv = new Ajv({ allErrors: true });
  addFormats(ajv);

  const validate = ajv.compile(schema);
  const valid = validate(data);

  if (valid) {
    return { valid: true, errors: [] };
  }

  const errors = (validate.errors || []).map((err) => {
    const field = err.instancePath || '(root)';
    const message = err.message || 'unknown error';
    const params = err.params ? ` ${JSON.stringify(err.params)}` : '';
    return `  ✗ ${field}: ${message}${params}`;
  });

  return { valid: false, errors };
}

function main() {
  const { input } = parseArgs();
  const inputPath = path.resolve(input);

  console.log(`Validating: ${inputPath}`);

  if (!fs.existsSync(inputPath)) {
    console.error(`Error: File not found: ${inputPath}`);
    process.exit(1);
  }

  let data: unknown;
  try {
    const content = fs.readFileSync(inputPath, 'utf-8');
    data = JSON.parse(content);
  } catch (e: any) {
    console.error(`Error: Failed to parse JSON: ${e.message}`);
    process.exit(1);
  }

  const result = validateSummary(data);

  if (result.valid) {
    console.log('✓ Valid — summary.json passes schema validation.');
    process.exit(0);
  } else {
    console.error(`✗ Invalid — ${result.errors.length} error(s) found:\n`);
    result.errors.forEach((err) => console.error(err));
    process.exit(1);
  }
}

// Only run CLI when executed directly, not when imported
const isDirectExecution = process.argv[1] && fileURLToPath(import.meta.url).includes(path.basename(process.argv[1]).replace(/\.[^.]+$/, ''));
if (isDirectExecution) {
  main();
}
