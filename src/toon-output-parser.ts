import { BaseOutputParser } from '@langchain/core/output_parsers';
import { decode } from '@toon-format/toon';
import { z } from 'zod';
import { zodSchemaToToonInstructions } from './zod-to-toon-instructions.js';

export interface ToonOutputParserOptions {
    /**
     * Delimiter used in TOON format (default: ',')
     * Use '\t' for tab-separated values (more token-efficient)
     */
    delimiter?: string;

    /**
     * Whether to use strict validation when decoding TOON (default: true)
     * Strict mode validates array counts, indentation, and escaping
     */
    strict?: boolean;
}

/**
 * Output parser that extracts and validates TOON-formatted responses
 * 
 * @template T The TypeScript type inferred from the Zod schema
 */
export class ToonOutputParser<T> extends BaseOutputParser<T> {
    lc_namespace = ['langchain', 'output_parsers', 'toon'];

    private schema: z.ZodType<T>;
    private options: Required<ToonOutputParserOptions>;

    constructor(schema: z.ZodType<T>, options: ToonOutputParserOptions = {}) {
        super();
        this.schema = schema;
        this.options = {
            delimiter: options.delimiter ?? ',',
            strict: options.strict ?? true,
        };
    }

    /**
     * Parse the LLM output, extract TOON, decode it, and validate against schema
     */
    async parse(text: string): Promise<T> {
        // Extract TOON content from the response
        const toonContent = this.extractToonContent(text);

        if (!toonContent) {
            throw new Error(
                'Could not extract TOON content from response. ' +
                'Expected response to contain TOON-formatted data in a code block or as plain text.'
            );
        }

        // Decode TOON to JavaScript object
        let decoded: unknown;
        try {
            decoded = decode(toonContent, {
                strict: this.options.strict,
            });
        } catch (error) {
            throw new Error(
                `Failed to decode TOON format: ${error instanceof Error ? error.message : String(error)}\n\n` +
                `TOON content:\n${toonContent}`
            );
        }

        // Validate against Zod schema
        try {
            return this.schema.parse(decoded);
        } catch (error) {
            if (error instanceof z.ZodError) {
                const issues = error.issues.map(issue =>
                    `  - ${issue.path.join('.')}: ${issue.message}`
                ).join('\n');

                throw new Error(
                    `Failed to validate TOON output against schema:\n${issues}\n\n` +
                    `Decoded data: ${JSON.stringify(decoded, null, 2)}`
                );
            }
            throw error;
        }
    }

    /**
     * Extract TOON content from LLM response
     * Handles code blocks (```toon, ```yaml, ```) and plain text
     */
    private extractToonContent(text: string): string | null {
        // Try to extract from code block first
        // Matches: ```toon\n...\n``` or ```yaml\n...\n``` or ```\n...\n```
        const codeBlockRegex = /```(?:toon|yaml)?\s*\n([\s\S]*?)\n```/;
        const match = text.match(codeBlockRegex);

        if (match && match[1]) {
            return match[1].trim();
        }

        // If no code block, treat the entire trimmed text as TOON
        const trimmed = text.trim();
        if (trimmed) {
            return trimmed;
        }

        return null;
    }

    /**
     * Get format instructions for the LLM
     * This generates a prompt that tells the LLM how to format its response
     */
    getFormatInstructions(): string {
        return zodSchemaToToonInstructions(this.schema);
    }
}
