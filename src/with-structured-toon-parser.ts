import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { Runnable, RunnableSequence, RunnableLambda } from '@langchain/core/runnables';
import { z } from 'zod';
import { ToonOutputParser, ToonOutputParserOptions } from './toon-output-parser.js';
import { BaseMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';

/**
 * Extension method for LangChain chat models to add structured TOON output parsing
 * 
 * This is the equivalent of `llm.withStructuredOutput()` but uses TOON format
 * instead of JSON for token efficiency.
 * 
 * @template T The TypeScript type inferred from the Zod schema
 * @param schema Zod schema defining the expected output structure
 * @param options Optional TOON parser configuration
 * @returns A runnable that outputs validated, typed data
 * 
 * @example
 * ```typescript
 * const UserSchema = z.object({
 *   name: z.string(),
 *   age: z.number().int().nonnegative(),
 * });
 * 
 * const llm = new ChatMistralAI({ model: "mistral-small-latest" });
 * const structured = llm.withStructuredToonParser(UserSchema);
 * 
 * const result = await structured.invoke("Extract: John is 30 years old");
 * // result is typed as { name: string; age: number }
 * ```
 */
export function withStructuredToonParser<T>(
    this: BaseChatModel,
    schema: z.ZodType<T>,
    options: ToonOutputParserOptions = {}
): Runnable<string | BaseMessage[], T> {
    const parser = new ToonOutputParser(schema, options);
    const formatInstructions = parser.getFormatInstructions();

    // Create a runnable that:
    // 1. Injects format instructions into the prompt
    // 2. Calls the LLM
    // 3. Parses and validates the output
    const withInstructions = RunnableLambda.from(async (input: string | BaseMessage[]) => {
        let messages: BaseMessage[];

        if (typeof input === 'string') {
            // Simple string input - add format instructions as system message
            messages = [
                new SystemMessage(formatInstructions),
                new HumanMessage(input),
            ];
        } else {
            // Array of messages - prepend format instructions as system message
            messages = [
                new SystemMessage(formatInstructions),
                ...input,
            ];
        }

        return messages;
    });

    // Chain: input → add instructions → LLM → parser
    return RunnableSequence.from([
        withInstructions,
        this,
        parser,
    ]);
}

/**
 * Augment the BaseChatModel prototype with the extension method
 * This makes `.withStructuredToonParser()` available on all LangChain chat models
 */
declare module '@langchain/core/language_models/chat_models' {
    interface BaseChatModel {
        withStructuredToonParser<T>(
            schema: z.ZodType<T>,
            options?: ToonOutputParserOptions
        ): Runnable<string | BaseMessage[], T>;
    }
}

// Apply the extension method to the prototype
BaseChatModel.prototype.withStructuredToonParser = withStructuredToonParser;
