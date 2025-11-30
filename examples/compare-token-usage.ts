import { z } from 'zod';
import { ChatMistralAI } from '@langchain/mistralai';
import '../src/index.js';
import { TokenUsageHandler } from './token-usage-handler.js';

/**
 * Compare JSON vs TOON token usage across multiple scenarios
 * 
 * Usage:
 *   export MISTRAL_API_KEY="your-key-here"
 *   tsx examples/compare-token-usage.ts
 */

// Scenario 1: Simple object with a few fields
const SimpleUserSchema = z.object({
    name: z.string(),
    age: z.number(),
    email: z.string(),
});

// Scenario 2: Object with array of items (TOON's strength)
const UserListSchema = z.object({
    users: z.array(z.object({
        id: z.number(),
        name: z.string(),
        email: z.string(),
        role: z.string(),
    })),
});

// Scenario 3: Nested object with multiple arrays
const CompanySchema = z.object({
    name: z.string(),
    founded: z.number(),
    employees: z.array(z.object({
        id: z.number(),
        name: z.string(),
        department: z.string(),
        salary: z.number(),
    })),
    offices: z.array(z.object({
        city: z.string(),
        country: z.string(),
        employees: z.number(),
    })),
});

// Scenario 4: EXTREME - Large transaction log (TOON's sweet spot!)
const TransactionLogSchema = z.object({
    transactions: z.array(z.object({
        id: z.number(),
        timestamp: z.string(),
        userId: z.number(),
        userName: z.string(),
        amount: z.number(),
        currency: z.string(),
        category: z.string(),
        description: z.string(),
        status: z.string(),
    })),
});

async function compareTokenUsage(
    llm: ChatMistralAI,
    schema: z.ZodType,
    prompt: string,
    scenario: string
): Promise<void> {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`📊 Scenario: ${scenario}`);
    console.log('='.repeat(70));

    // Test with JSON (standard LangChain withStructuredOutput)
    const jsonHandler = new TokenUsageHandler();

    console.log('\n🔵 Testing with JSON format...');
    const startJson = Date.now();
    let jsonTokens = { input: 0, output: 0, total: 0 };
    try {
        const jsonStructured = llm.withStructuredOutput(schema);
        await jsonStructured.invoke(prompt, { callbacks: [jsonHandler] });
        const jsonTime = Date.now() - startJson;
        jsonTokens = jsonHandler.totals();
        console.log(`   ✅ Success (${jsonTime}ms)`);
        console.log(`   📥 Input tokens:  ${jsonTokens.input}`);
        console.log(`   📤 Output tokens: ${jsonTokens.output}`);
        console.log(`   📊 Total tokens:  ${jsonTokens.total}`);
    } catch (error) {
        console.log(`   ❌ Error: ${error instanceof Error ? error.message : String(error)}`);
        return;
    }

    // Test with TOON
    const toonHandler = new TokenUsageHandler();

    console.log('\n🟢 Testing with TOON format...');
    const startToon = Date.now();
    let toonTokens = { input: 0, output: 0, total: 0 };
    try {
        const toonStructured = llm.withStructuredToonParser(schema);
        await toonStructured.invoke(prompt, { callbacks: [toonHandler] });
        const toonTime = Date.now() - startToon;
        toonTokens = toonHandler.totals();
        console.log(`   ✅ Success (${toonTime}ms)`);
        console.log(`   📥 Input tokens:  ${toonTokens.input}`);
        console.log(`   📤 Output tokens: ${toonTokens.output}`);
        console.log(`   📊 Total tokens:  ${toonTokens.total}`);
    } catch (error) {
        console.log(`   ❌ Error: ${error instanceof Error ? error.message : String(error)}`);
        return;
    }

    // Calculate savings
    const inputSavings = jsonTokens.input - toonTokens.input;
    const outputSavings = jsonTokens.output - toonTokens.output;
    const totalSavings = jsonTokens.total - toonTokens.total;

    const inputPercent = ((inputSavings / jsonTokens.input) * 100).toFixed(1);
    const outputPercent = ((outputSavings / jsonTokens.output) * 100).toFixed(1);
    const totalPercent = ((totalSavings / jsonTokens.total) * 100).toFixed(1);

    console.log('\n💰 Token Savings with TOON:');
    console.log(`   📥 Input:  ${inputSavings > 0 ? '-' : '+'}${Math.abs(inputSavings)} tokens (${inputPercent}%)`);
    console.log(`   📤 Output: ${outputSavings > 0 ? '-' : '+'}${Math.abs(outputSavings)} tokens (${outputPercent}%)`);
    console.log(`   📊 Total:  ${totalSavings > 0 ? '-' : '+'}${Math.abs(totalSavings)} tokens (${totalPercent}%)`);

    if (totalSavings > 0) {
        console.log(`\n   🎉 TOON saved ${totalPercent}% tokens overall!`);
    } else {
        console.log(`\n   ℹ️  JSON was more efficient for this scenario`);
    }
}

async function main() {
    console.log('🚀 JSON vs TOON Token Usage Comparison\n');
    console.log('This example compares actual token usage between JSON and TOON formats');
    console.log('across different data structure scenarios.\n');

    if (!process.env.MISTRAL_API_KEY) {
        console.error('❌ MISTRAL_API_KEY not found in environment');
        console.error('   Set it in your .env file or export it:');
        console.error('   export MISTRAL_API_KEY="your-key-here"');
        process.exit(1);
    }

    const llm = new ChatMistralAI({
        model: 'mistral-small-latest',
        temperature: 0,
    });

    // Scenario 1: Simple object
    await compareTokenUsage(
        llm,
        SimpleUserSchema,
        'Extract user info: Alice Johnson is 28 years old, email alice@example.com',
        'Simple Object (3 fields)'
    );

    // Scenario 2: Array of users (TOON should excel here)
    await compareTokenUsage(
        llm,
        UserListSchema,
        `Extract all users from this list:
        1. Alice (ID: 1, alice@example.com, role: admin)
        2. Bob (ID: 2, bob@example.com, role: user)
        3. Carol (ID: 3, carol@example.com, role: moderator)
        4. Dave (ID: 4, dave@example.com, role: user)
        5. Eve (ID: 5, eve@example.com, role: admin)`,
        'Array of Objects (5 users, 4 fields each)'
    );

    // Scenario 3: Complex nested structure
    await compareTokenUsage(
        llm,
        CompanySchema,
        `Extract company information:
        TechCorp was founded in 2015.
        
        Employees:
        - Alice (ID 1, Engineering, $120k)
        - Bob (ID 2, Marketing, $90k)
        - Carol (ID 3, Engineering, $130k)
        - Dave (ID 4, Sales, $100k)
        - Eve (ID 5, Engineering, $125k)
        
        Offices:
        - San Francisco, USA (150 employees)
        - London, UK (80 employees)
        - Tokyo, Japan (60 employees)`,
        'Complex Nested Structure (2 arrays with different schemas)'
    );

    // Scenario 4: EXTREME - Large array with many fields (TOON's sweet spot!)
    await compareTokenUsage(
        llm,
        TransactionLogSchema,
        `Extract all transactions from this log:
        
        Transaction #1: 2025-01-15T10:30:00Z - User 101 (Alice Johnson) paid $299.99 USD for Electronics purchase, Status: completed
        Transaction #2: 2025-01-15T11:15:22Z - User 102 (Bob Smith) paid $49.50 USD for Groceries shopping, Status: completed
        Transaction #3: 2025-01-15T12:05:18Z - User 103 (Carol White) paid $1,250.00 USD for Rent payment, Status: completed
        Transaction #4: 2025-01-15T13:22:45Z - User 104 (Dave Brown) paid $85.30 USD for Utilities bill, Status: completed
        Transaction #5: 2025-01-15T14:10:33Z - User 105 (Eve Davis) paid $15.99 USD for Subscription service, Status: completed
        Transaction #6: 2025-01-15T15:30:12Z - User 106 (Frank Miller) paid $450.00 USD for Travel booking, Status: completed
        Transaction #7: 2025-01-15T16:45:55Z - User 107 (Grace Lee) paid $199.99 USD for Clothing purchase, Status: completed
        Transaction #8: 2025-01-15T17:20:40Z - User 108 (Henry Wilson) paid $75.25 USD for Dining restaurant, Status: completed
        Transaction #9: 2025-01-15T18:05:15Z - User 109 (Ivy Martinez) paid $32.50 USD for Entertainment movie, Status: completed
        Transaction #10: 2025-01-15T19:15:28Z - User 110 (Jack Taylor) paid $120.00 USD for Healthcare appointment, Status: completed
        Transaction #11: 2025-01-15T20:30:50Z - User 111 (Kate Anderson) paid $89.99 USD for Beauty products, Status: completed
        Transaction #12: 2025-01-15T21:10:05Z - User 112 (Liam Thomas) paid $650.00 USD for Insurance premium, Status: completed
        Transaction #13: 2025-01-16T08:15:22Z - User 113 (Mia Jackson) paid $25.00 USD for Coffee cafe, Status: completed
        Transaction #14: 2025-01-16T09:40:18Z - User 114 (Noah Harris) paid $340.50 USD for Home improvement, Status: completed
        Transaction #15: 2025-01-16T10:55:33Z - User 115 (Olivia Clark) paid $55.75 USD for Books purchase, Status: completed`,
        'EXTREME: Transaction Log (15 transactions × 9 fields = 135 data points!)'
    );

    console.log('\n' + '='.repeat(70));
    console.log('✨ Summary');
    console.log('='.repeat(70));
    console.log('TOON format saves the most tokens with large arrays of uniform objects.');
    console.log('Each item in JSON repeats ALL field names, but TOON lists them once!');
    console.log('\n📈 Token savings scale with:');
    console.log('   • Number of array items (more items = more savings)');
    console.log('   • Number of fields per item (more fields = more savings)');
    console.log('\n💡 For the extreme scenario (15 items × 9 fields):');
    console.log('   JSON repeats 135 field names, TOON lists them once!');
    console.log('   This is where TOON really shines! 🌟');
}

main().catch(console.error);
