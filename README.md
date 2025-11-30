# langchain-toon-output-parser

A LangChain community add-on that enables structured output parsing using **TOON** (Token-Oriented Object Notation) instead of JSON, with **Zod** schema validation.

## Why TOON?

TOON is a compact, LLM-friendly data format that:

- **Reduces token usage by 30-60%** compared to JSON for array-heavy data
- Uses **CSV-like tabular format** for uniform arrays (no repeated keys)
- Provides **explicit structure markers** (`[N]` for counts, `{fields}` for headers)
- Is **human-readable** with YAML-style indentation

Perfect for cost-sensitive LLM applications or large context windows!

## Installation

```bash
npm install langchain-toon-output-parser
```

## Quick Start

```typescript
import { z } from "zod";
import { ChatMistralAI } from "@langchain/mistralai";
import "langchain-toon-output-parser";

// 1. Define your schema with Zod
const UserSchema = z.object({
  name: z.string(),
  age: z.number().int().nonnegative(),
  email: z.string().email(),
});

// 2. Create an LLM instance (any LangChain chat model works!)
const llm = new ChatMistralAI({
  model: "mistral-small-latest",
  temperature: 0,
});

// 3. Use withStructuredToonParser for typed, validated outputs
const structuredLLM = llm.withStructuredToonParser(UserSchema);

// 4. Get type-safe results!
const result = await structuredLLM.invoke(
  "Extract: John Doe is 30 years old, email john@example.com"
);

console.log(result.name); // "John Doe" (TypeScript knows the type!)
console.log(result.age); // 30
console.log(result.email); // "john@example.com"
```

## How It Works

The library:

1. **Analyzes your Zod schema** and generates TOON format instructions
2. **Augments your prompt** with these instructions
3. **Invokes the LLM** which responds in TOON format
4. **Extracts and decodes** the TOON from the response
5. **Validates** the result against your Zod schema
6. **Returns** a typed, validated JavaScript object

## Features

✅ **Works with ALL LangChain chat models** (OpenAI, Anthropic, Google, Mistral, etc.)  
✅ **Type-safe** - Full TypeScript inference from Zod schemas  
✅ **Token-efficient** - TOON uses 30-60% fewer tokens than JSON  
✅ **Flexible** - Supports primitives, objects, arrays, nested structures  
✅ **Robust** - Validates structure and schema, clear error messages  
✅ **Easy to use** - Just like `.withStructuredOutput()` but with TOON

## Advanced Usage

### Nested Objects and Arrays

TOON really shines with arrays of objects:

```typescript
const CompanySchema = z.object({
  name: z.string(),
  employees: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      role: z.string(),
    })
  ),
});

const llm = new ChatOpenAI({ model: "gpt-4" });
const structured = llm.withStructuredToonParser(CompanySchema);

const result = await structured.invoke("List employees at TechCorp...");
// result.employees is fully typed and validated!
```

**TOON advantage**: Instead of repeating `{"id": ..., "name": ..., "role": ...}` for each employee, TOON uses:

```toon
employees[3]{id,name,role}:
  1,Alice,Engineer
  2,Bob,Manager
  3,Carol,Designer
```

### Custom Options

```typescript
// Use tab delimiters for even better token efficiency
const structured = llm.withStructuredToonParser(schema, {
  delimiter: "\t", // Tab-separated values
  strict: true, // Strict validation (default)
});
```

### Using the Parser Directly

```typescript
import { ToonOutputParser } from "langchain-toon-output-parser";

const parser = new ToonOutputParser(UserSchema);

// Get format instructions to include in your prompt
const instructions = parser.getFormatInstructions();

// Parse LLM output manually
const result = await parser.parse(llmResponse);
```

## Examples

Check out the [`examples/`](./examples) directory:

- [`basic-usage.ts`](./examples/basic-usage.ts) - Simple object schema
- [`nested-objects.ts`](./examples/nested-objects.ts) - Complex nested structures
- [`compare-token-usage.ts`](./examples/compare-token-usage.ts) - **Compare JSON vs TOON token usage**

Run them:

```bash
export MISTRAL_API_KEY="your-key-here"
npm run example:basic
npm run example:nested
npm run example:compare  # See real token savings!
```

### Token Savings Comparison

The `compare-token-usage` example measures actual API token consumption:

```bash
npm run example:compare
```

**Example output:**

```
📊 Scenario: Array of Objects (5 users, 4 fields each)
🔵 JSON:  Total tokens: 245
🟢 TOON:  Total tokens: 156
💰 TOON saved 89 tokens (36.3%)!
```

The example tests multiple scenarios:

- Simple objects (3 fields)
- Arrays of objects (5 users with 4 fields each)
- Complex nested structures (multiple arrays)

**Key takeaway**: TOON saves 30-60% tokens for array-heavy data!

## API Reference

### `llm.withStructuredToonParser(schema, options?)`

Extension method available on all LangChain chat models.

**Parameters:**

- `schema: z.ZodType<T>` - Zod schema defining output structure
- `options?: ToonOutputParserOptions` - Optional configuration
  - `delimiter?: string` - Field delimiter (default: `','`, use `'\t'` for tabs)
  - `strict?: boolean` - Enable strict TOON validation (default: `true`)

**Returns:** `Runnable<string | BaseMessage[], T>` - A runnable that outputs typed data

### `ToonOutputParser<T>`

Output parser class for manual usage.

**Constructor:**

```typescript
new ToonOutputParser(schema: z.ZodType<T>, options?: ToonOutputParserOptions)
```

**Methods:**

- `parse(text: string): Promise<T>` - Parse and validate TOON output
- `getFormatInstructions(): string` - Get prompt instructions for the LLM

### `zodSchemaToToonInstructions(schema)`

Utility function to generate TOON format instructions from a Zod schema.

**Parameters:**

- `schema: z.ZodType` - Zod schema

**Returns:** `string` - Format instructions for LLM prompts

## Supported Schema Types

- ✅ Primitives: `string`, `number`, `boolean`, `date`
- ✅ Objects: `z.object({})`
- ✅ Arrays: `z.array()` (especially efficient for arrays of objects)
- ✅ Nested structures
- ✅ Optional fields: `z.optional()`
- ✅ Enums: `z.enum()`
- ✅ Nullable: `z.nullable()`

## Compatibility

Works with **all LangChain chat models**, including:

- OpenAI (`@langchain/openai`)
- Anthropic (`@langchain/anthropic`)
- Google (`@langchain/google-genai`)
- Mistral (`@langchain/mistralai`)
- Cohere, Groq, and more!

## Error Handling

The parser provides clear error messages:

```typescript
try {
  const result = await structuredLLM.invoke(prompt);
} catch (error) {
  // Errors include:
  // - Failed to extract TOON from response
  // - Failed to decode TOON format (syntax errors)
  // - Failed to validate against schema (Zod validation errors)
}
```

## About TOON Format

TOON (Token-Oriented Object Notation) is an open-source format designed for LLMs:

- **Spec**: [github.com/toon-format/spec](https://github.com/toon-format/spec)
- **Website**: [toonformat.dev](https://toonformat.dev)
- **TypeScript SDK**: [@toon-format/toon](https://www.npmjs.com/package/@toon-format/toon)

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Submit a pull request

## License

MIT © langchain-toon-output-parser contributors

## Related

- [LangChain](https://js.langchain.com/) - Framework for LLM applications
- [Zod](https://zod.dev/) - TypeScript-first schema validation
- [TOON Format](https://toonformat.dev/) - Token-efficient data format for LLMs
