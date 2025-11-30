import { z } from 'zod';
import { ChatMistralAI } from '@langchain/mistralai';
import '../src/index.js';

/**
 * Advanced example with nested objects and arrays
 * Demonstrates TOON's efficient array handling
 * 
 * Usage:
 *   export MISTRAL_API_KEY="your-key-here"
 *   npm run example:nested
 */

// Complex schema with nested structures
const CompanySchema = z.object({
    name: z.string(),
    founded: z.number().int(),
    employees: z.array(z.object({
        id: z.number(),
        name: z.string(),
        role: z.string(),
        salary: z.number(),
    })),
    headquarters: z.object({
        city: z.string(),
        country: z.string(),
    }),
});

async function main() {
    console.log('🚀 LangChain TOON Output Parser - Nested Objects Example\n');

    const llm = new ChatMistralAI({
        model: 'mistral-small-latest',
        temperature: 0,
    });

    const structuredLLM = llm.withStructuredToonParser(CompanySchema);

    console.log('📝 Prompt: Extract company information...\n');

    const result = await structuredLLM.invoke(`
    Extract information about this company:
    
    TechCorp was founded in 2010 and is headquartered in San Francisco, USA.
    
    Their employees include:
    - Alice Johnson (ID: 1) works as a Software Engineer earning $120,000
    - Bob Smith (ID: 2) is a Product Manager making $130,000
    - Carol White (ID: 3) serves as a Designer with a salary of $110,000
  `);

    console.log('✅ Parsed and validated result:');
    console.log(JSON.stringify(result, null, 2));

    console.log('\n📊 Type-safe access:');
    console.log(`Company: ${result.name} (founded ${result.founded})`);
    console.log(`Location: ${result.headquarters.city}, ${result.headquarters.country}`);
    console.log(`Employees (${result.employees.length}):`);
    result.employees.forEach(emp => {
        console.log(`  - ${emp.name}: ${emp.role} (ID: ${emp.id})`);
    });

    console.log('\n💡 TOON format is especially efficient for arrays like this!');
    console.log('   JSON would repeat "id", "name", "role", "salary" keys for each employee.');
    console.log('   TOON uses a tabular format: employees[3]{id,name,role,salary}:');
}

main().catch(console.error);
