import { BaseCallbackHandler } from '@langchain/core/callbacks/base';
import type { LLMResult } from '@langchain/core/outputs';

export interface TokenTotals {
    input: number;
    output: number;
    total: number;
}

/**
 * Callback handler to track token usage
 */
export class TokenUsageHandler extends BaseCallbackHandler {
    name = "token-usage-handler";
    private _input = 0;
    private _output = 0;

    handleLLMEnd(
        output: LLMResult,
        _runId: string,
        _parentRunId?: string,
        _tags?: string[]
    ): void {
        const usage = this.extractUsage(output);
        this._input += usage.input;
        this._output += usage.output;
    }

    private extractUsage(output: LLMResult): TokenTotals {
        // LangChain stores usage info in llmOutput
        const llmOutput = output.llmOutput;
        if (llmOutput && typeof llmOutput === 'object') {
            const usage = (llmOutput as any).usage || (llmOutput as any).tokenUsage || {};
            return {
                input: usage.prompt_tokens || usage.promptTokens || 0,
                output: usage.completion_tokens || usage.completionTokens || 0,
                total: usage.total_tokens || usage.totalTokens || 0,
            };
        }
        return { input: 0, output: 0, total: 0 };
    }

    totals(): TokenTotals {
        const total = this._input + this._output;
        return { input: this._input, output: this._output, total };
    }

    reset(): void {
        this._input = 0;
        this._output = 0;
    }
}
