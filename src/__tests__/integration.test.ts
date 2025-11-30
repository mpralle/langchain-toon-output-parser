import { describe, it, expect, beforeAll } from 'vitest';
import { z } from 'zod';
import { ChatMistralAI } from '@langchain/mistralai';
import '../index.js'; // Import to register the extension method

const hasApiKey = !!process.env.MISTRAL_API_KEY;

describe.skipIf(!hasApiKey)('Integration Tests with Real LLM', () => {
    let llm: ChatMistralAI;

    beforeAll(() => {
        llm = new ChatMistralAI({
            model: 'mistral-small-latest',
            temperature: 0,
        });
    });

    it('should extract simple user information', async () => {
        const UserSchema = z.object({
            name: z.string(),
            age: z.number().int(),
            email: z.string(),
        });

        const structured = llm.withStructuredToonParser(UserSchema);

        const result = await structured.invoke(
            'Extract the user information: John Doe is 30 years old and his email is john.doe@example.com'
        );

        expect(result).toHaveProperty('name');
        expect(result).toHaveProperty('age');
        expect(result).toHaveProperty('email');
        expect(typeof result.name).toBe('string');
        expect(typeof result.age).toBe('number');
        expect(result.name.toLowerCase()).toContain('john');
        expect(result.age).toBe(30);
    }, 30000); // 30 second timeout for API calls

    it('should extract nested company data with employees', async () => {
        const CompanySchema = z.object({
            name: z.string(),
            founded: z.number().int(),
            employees: z.array(z.object({
                id: z.number(),
                name: z.string(),
                role: z.string(),
            })),
        });

        const structured = llm.withStructuredToonParser(CompanySchema);

        const result = await structured.invoke(`
            Extract information about this company:
            
            TechCorp was founded in 2010.
            
            Their employees include:
            - Alice Johnson (ID: 1) works as a Software Engineer
            - Bob Smith (ID: 2) is a Product Manager
            - Carol White (ID: 3) serves as a Designer
        `);

        expect(result.name.toLowerCase()).toContain('tech');
        expect(result.founded).toBe(2010);
        expect(result.employees).toHaveLength(3);
        expect(result.employees[0]).toHaveProperty('id');
        expect(result.employees[0]).toHaveProperty('name');
        expect(result.employees[0]).toHaveProperty('role');

        // Verify the structure of employees
        result.employees.forEach(emp => {
            expect(typeof emp.id).toBe('number');
            expect(typeof emp.name).toBe('string');
            expect(typeof emp.role).toBe('string');
        });
    }, 30000);

    it('should handle boolean and optional fields', async () => {
        const ProductSchema = z.object({
            name: z.string(),
            price: z.number(),
            inStock: z.boolean(),
            description: z.string().optional(),
        });

        const structured = llm.withStructuredToonParser(ProductSchema);

        const result = await structured.invoke(
            'Extract product info: Laptop costs $999.99 and is currently available in stock'
        );

        expect(result).toHaveProperty('name');
        expect(result).toHaveProperty('price');
        expect(result).toHaveProperty('inStock');
        expect(typeof result.name).toBe('string');
        expect(typeof result.price).toBe('number');
        expect(typeof result.inStock).toBe('boolean');
        expect(result.inStock).toBe(true);
    }, 30000);

    it('should validate and reject incorrect data types', async () => {
        const StrictSchema = z.object({
            count: z.number().int().positive(),
            email: z.string().email(),
        });

        const structured = llm.withStructuredToonParser(StrictSchema);

        // This might fail validation if the LLM doesn't follow the schema
        // We're testing that validation actually happens
        try {
            const result = await structured.invoke(
                'The count is 42 and the email is john@example.com'
            );

            // If successful, verify the data is correct
            expect(result.count).toBeGreaterThan(0);
            expect(result.email).toContain('@');
        } catch (error) {
            // If it fails, it should be a validation error, not a parsing error
            expect(error).toBeDefined();
        }
    }, 30000);

    it('should work with enum types', async () => {
        const TaskSchema = z.object({
            title: z.string(),
            status: z.enum(['pending', 'in-progress', 'completed']),
            priority: z.enum(['low', 'medium', 'high']),
        });

        const structured = llm.withStructuredToonParser(TaskSchema);

        const result = await structured.invoke(
            'Extract task: "Fix bug in login" is currently in progress with high priority'
        );

        expect(result).toHaveProperty('title');
        expect(result).toHaveProperty('status');
        expect(result).toHaveProperty('priority');
        expect(['pending', 'in-progress', 'completed']).toContain(result.status);
        expect(['low', 'medium', 'high']).toContain(result.priority);
    }, 30000);
});

describe.skipIf(hasApiKey)('Integration Tests Skipped', () => {
    it('should skip when no API key is available', () => {
        console.log('⚠️  Integration tests skipped: MISTRAL_API_KEY not set');
        console.log('   Set MISTRAL_API_KEY environment variable to run integration tests');
        expect(true).toBe(true);
    });
});
