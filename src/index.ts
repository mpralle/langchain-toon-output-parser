/**
 * langchain-toon-output-parser
 * 
 * LangChain community add-on for structured output parsing using TOON format
 * with Zod schema validation.
 * 
 * @packageDocumentation
 */

export { ToonOutputParser } from './toon-output-parser.js';
export type { ToonOutputParserOptions } from './toon-output-parser.js';
export { zodSchemaToToonInstructions } from './zod-to-toon-instructions.js';
export { withStructuredToonParser } from './with-structured-toon-parser.js';

// Import the extension to ensure the prototype is augmented
import './with-structured-toon-parser.js';
