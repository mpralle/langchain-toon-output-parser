import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { ToonOutputParser } from '../toon-output-parser.js';

describe('ToonOutputParser', () => {
    describe('parse', () => {
        it('should parse valid TOON from code block', async () => {
            const schema = z.object({
                name: z.string(),
                age: z.number(),
            });

            const parser = new ToonOutputParser(schema);
            const toonResponse = `\`\`\`toon
name: John
age: 30
\`\`\``;

            const result = await parser.parse(toonResponse);

            expect(result).toEqual({ name: 'John', age: 30 });
        });

        it('should parse TOON without code blocks', async () => {
            const schema = z.object({
                name: z.string(),
                count: z.number(),
            });

            const parser = new ToonOutputParser(schema);
            const toonResponse = `name: Alice\ncount: 42`;

            const result = await parser.parse(toonResponse);

            expect(result).toEqual({ name: 'Alice', count: 42 });
        });

        it('should parse arrays in TOON format', async () => {
            const schema = z.object({
                users: z.array(z.object({
                    id: z.number(),
                    name: z.string(),
                })),
            });

            const parser = new ToonOutputParser(schema);
            const toonResponse = `users[2]{id,name}:
  1,Alice
  2,Bob`;

            const result = await parser.parse(toonResponse);

            expect(result.users).toHaveLength(2);
            expect(result.users[0]).toEqual({ id: 1, name: 'Alice' });
            expect(result.users[1]).toEqual({ id: 2, name: 'Bob' });
        });

        it('should throw error for schema validation failure when TOON decodes but schema fails', async () => {
            const schema = z.object({ name: z.string() });
            const parser = new ToonOutputParser(schema);

            // This will decode as a string, but the schema expects an object
            await expect(parser.parse('invalid toon format {]')).rejects.toThrow('Failed to validate');
        });

        it('should throw error for schema validation failure', async () => {
            const schema = z.object({
                age: z.number(),
            });

            const parser = new ToonOutputParser(schema);
            const toonResponse = 'age: not-a-number'; // Invalid: age should be number

            await expect(parser.parse(toonResponse)).rejects.toThrow('Failed to validate');
        });

        it('should throw error when TOON cannot be extracted', async () => {
            const schema = z.object({ name: z.string() });
            const parser = new ToonOutputParser(schema);

            await expect(parser.parse('')).rejects.toThrow('Could not extract TOON content');
        });
    });

    describe('getFormatInstructions', () => {
        it('should generate instructions for simple object schema', () => {
            const schema = z.object({
                name: z.string(),
                age: z.number(),
            });

            const parser = new ToonOutputParser(schema);
            const instructions = parser.getFormatInstructions();

            expect(instructions).toContain('TOON format');
            expect(instructions).toContain('name:');
            expect(instructions).toContain('age:');
        });

        it('should generate instructions for array schema', () => {
            const schema = z.object({
                items: z.array(z.object({
                    id: z.number(),
                    value: z.string(),
                })),
            });

            const parser = new ToonOutputParser(schema);
            const instructions = parser.getFormatInstructions();

            expect(instructions).toContain('[N]');
            expect(instructions).toContain('id,value');
        });
    });
});
