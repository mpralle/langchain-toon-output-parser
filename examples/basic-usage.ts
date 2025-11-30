import 'dotenv/config';
import { z } from 'zod';
import { ChatMistralAI } from '@langchain/mistralai';
import '../src/index.js';

/**
 * Basic example demonstrating structured TOON output parsing
 * 
 * Usage:
 *   export MISTRAL_API_KEY="your-key-here"
 *   npm run example:basic
 */

// 1. Define your schema with Zod
const UserSchema = z.object({
    name: z.string(),
    age: z.number().int().nonnegative(),
    email: z.string().email(),
});

async function main() {
    console.log('🚀 LangChain TOON Output Parser - Basic Example\n');

    // 2. Create an LLM instance (Mistral in this case)
    const llm = new ChatMistralAI({
        model: 'mistral-small-latest',
        temperature: 0,
    });

    // 3. Use withStructuredToonParser to get typed, validated outputs
    const structuredLLM = llm.withStructuredToonParser(UserSchema);

    // 4. Invoke with a prompt
    console.log('📝 Prompt: Extract user information from this text...\n');

    const result = await structuredLLM.invoke(
        'Extract the user information: John Doe is 30 years old and his email is john.doe@example.com'
    );

    console.log('✅ Parsed and validated result:');
    console.log(JSON.stringify(result, null, 2));
    console.log('\n📊 Result type:', typeof result);
    console.log('✨ TypeScript knows the shape:', {
        name: result.name,
        age: result.age,
        email: result.email,
    });
}

main().catch(console.error);
