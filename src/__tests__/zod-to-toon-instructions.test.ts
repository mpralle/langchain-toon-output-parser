import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { zodSchemaToToonInstructions } from '../zod-to-toon-instructions.js';

describe('zodSchemaToToonInstructions', () => {
    it('should generate instructions for primitive types', () => {
        const schema = z.object({
            name: z.string(),
            age: z.number(),
            active: z.boolean(),
        });

        const instructions = zodSchemaToToonInstructions(schema);

        expect(instructions).toContain('TOON format');
        expect(instructions).toContain('name:');
        expect(instructions).toContain('age:');
        expect(instructions).toContain('active:');
    });

    it('should generate instructions for array of objects', () => {
        const schema = z.object({
            users: z.array(z.object({
                id: z.number(),
                name: z.string(),
            })),
        });

        const instructions = zodSchemaToToonInstructions(schema);

        expect(instructions).toContain('users[2]{id,name}:');
        expect(instructions).toContain('[2]');
    });

    it('should handle nested objects', () => {
        const schema = z.object({
            user: z.object({
                name: z.string(),
                address: z.object({
                    city: z.string(),
                }),
            }),
        });

        const instructions = zodSchemaToToonInstructions(schema);

        expect(instructions).toContain('user:');
        expect(instructions).toContain('name:');
        expect(instructions).toContain('address:');
        expect(instructions).toContain('city:');
    });

    it('should handle optional fields', () => {
        const schema = z.object({
            name: z.string(),
            nickname: z.string().optional(),
        });

        const instructions = zodSchemaToToonInstructions(schema);

        expect(instructions).toContain('name:');
        expect(instructions).toContain('nickname:');
    });

    it('should handle enum types', () => {
        const schema = z.object({
            role: z.enum(['admin', 'user', 'guest']),
        });

        const instructions = zodSchemaToToonInstructions(schema);

        expect(instructions).toContain('role:');
    });

    it('should handle date types', () => {
        const schema = z.object({
            createdAt: z.date(),
        });

        const instructions = zodSchemaToToonInstructions(schema);

        expect(instructions).toContain('createdAt:');
        expect(instructions).toContain('2025'); // Should include example date
    });
});
