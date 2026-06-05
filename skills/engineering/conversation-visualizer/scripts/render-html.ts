import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { validateSummary } from "./validate-summary.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function printUsage() {
  console.log(`
Usage: npx tsx render-html.ts [options]

Options:
  -i, --input <path>     Path to the summary.json file. (Default: ./summary.json)
  -o, --output <path>    Path to the output HTML file. (Default: ./summary.html)
  -t, --title <string>   Override the title of the HTML page. (Optional)
  -h, --help             Show this help message.
`);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const options: {
    input: string;
    output: string;
    title?: string;
  } = {
    input: "summary.json",
    output: "summary.html",
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "-h" || arg === "--help") {
      printUsage();
      process.exit(0);
    } else if (arg === "-i" || arg === "--input") {
      options.input = args[++i];
    } else if (arg === "-o" || arg === "--output") {
      options.output = args[++i];
    } else if (arg === "-t" || arg === "--title") {
      options.title = args[++i];
    }
  }

  return options;
}

function main() {
  const options = parseArgs();

  try {
    const inputPath = path.resolve(options.input);
    const outputPath = path.resolve(options.output);

    console.log(`Reading structured summary from: ${inputPath}`);
    if (!fs.existsSync(inputPath)) {
      console.error(`Error: Input JSON file does not exist at: ${inputPath}`);
      printUsage();
      process.exit(1);
    }

    const jsonContent = fs.readFileSync(inputPath, "utf-8");
    let data: any;
    try {
      data = JSON.parse(jsonContent);
    } catch (e: any) {
      console.error(`Error: Failed to parse input file as JSON: ${e.message}`);
      process.exit(1);
    }

    // Schema Validation
    const validation = validateSummary(data);
    if (!validation.valid) {
      console.error("Error: Input JSON does not pass schema validation:\n");
      validation.errors.forEach((err) => console.error(err));
      process.exit(1);
    }

    // Override title if requested
    if (options.title) {
      data.title = options.title;
    }

    // Locate HTML template
    const templatePath = path.join(
      __dirname,
      "..",
      "templates",
      "summary-template.html",
    );
    if (!fs.existsSync(templatePath)) {
      console.error(`Error: HTML template file not found at: ${templatePath}`);
      process.exit(1);
    }

    let htmlTemplate = fs.readFileSync(templatePath, "utf-8");

    // Interpolate data safely into placeholder
    // We stringify it directly to be assigned to the javascript variable.
    const escapedJsonString = JSON.stringify(data);
    htmlTemplate = htmlTemplate.replace(
      "__CONVERSATION_LOGS_PLACEHOLDER__",
      escapedJsonString,
    );

    // Create parent directories if they don't exist
    const parentDir = path.dirname(outputPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, htmlTemplate, "utf-8");
    console.log(`Successfully generated visual brief HTML at: ${outputPath}`);
  } catch (error: any) {
    console.error("Error running render-html:");
    console.error(error.message);
    process.exit(1);
  }
}

main();
