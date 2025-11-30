import { z } from 'zod';

/**
 * Generates TOON format instructions from a Zod schema
 * This creates a prompt snippet that tells the LLM how to format its response
 */
export function zodSchemaToToonInstructions(schema: z.ZodType): string {
    const shape = getSchemaShape(schema);
    const example = generateToonExample(shape);

    return `Please respond in TOON format (Token-Oriented Object Notation).

TOON Format Rules:
- Use 2-space indentation for nested objects
- Arrays use the format: arrayName[N]{field1,field2,...}:
- The [N] must match the actual number of rows
- Fields are comma-separated (or tab-separated if specified)
- Strings with commas, quotes, or newlines must be quoted and escaped

Expected structure:
\`\`\`toon
${example}
\`\`\`

Respond ONLY with the TOON-formatted data inside a code block.`;
}

/**
 * Extract the shape/structure from a Zod schema
 */
function getSchemaShape(schema: z.ZodType): SchemaShape {
    // Unwrap z.optional(), z.nullable(), z.default(), etc.
    let unwrapped: any = schema;
    while (unwrapped instanceof z.ZodOptional ||
        unwrapped instanceof z.ZodNullable ||
        unwrapped instanceof z.ZodDefault) {
        unwrapped = (unwrapped._def as any).innerType || (unwrapped._def as any).type || unwrapped;
    }

    if (unwrapped instanceof z.ZodObject) {
        const shape = unwrapped._def.shape();
        const fields: Record<string, SchemaShape> = {};

        for (const [key, value] of Object.entries(shape)) {
            fields[key] = getSchemaShape(value as z.ZodType);
        }

        return { type: 'object', fields };
    }

    if (unwrapped instanceof z.ZodArray) {
        const elementType = getSchemaShape(unwrapped._def.type);
        return { type: 'array', element: elementType };
    }

    if (unwrapped instanceof z.ZodString) {
        return { type: 'string' };
    }

    if (unwrapped instanceof z.ZodNumber) {
        return { type: 'number' };
    }

    if (unwrapped instanceof z.ZodBoolean) {
        return { type: 'boolean' };
    }

    if (unwrapped instanceof z.ZodDate) {
        return { type: 'date' };
    }

    if (unwrapped instanceof z.ZodEnum) {
        return { type: 'enum', values: unwrapped._def.values };
    }

    // Default to string for unknown types
    return { type: 'string' };
}

/**
 * Generate an example TOON output based on the schema shape
 */
function generateToonExample(shape: SchemaShape, indent: number = 0): string {
    const spaces = '  '.repeat(indent);

    if (shape.type === 'object' && shape.fields) {
        const lines: string[] = [];

        for (const [key, fieldShape] of Object.entries(shape.fields)) {
            if (fieldShape.type === 'array') {
                // Array field
                const arrayExample = generateToonExample(fieldShape, indent);
                lines.push(`${spaces}${key}${arrayExample}`);
            } else if (fieldShape.type === 'object') {
                // Nested object
                lines.push(`${spaces}${key}:`);
                lines.push(generateToonExample(fieldShape, indent + 1));
            } else {
                // Primitive field (shown inline for objects)
                const exampleValue = getExampleValue(fieldShape);
                lines.push(`${spaces}${key}: ${exampleValue}`);
            }
        }

        return lines.join('\n');
    }

    if (shape.type === 'array' && shape.element) {
        if (shape.element.type === 'object' && shape.element.fields) {
            // Array of objects - use TOON's efficient tabular format
            const fields = shape.element.type === 'object' && shape.element.fields ? shape.element.fields : {};
            const fieldNames = Object.keys(fields);
            const header = `[N]{${fieldNames.join(',')}}:`;

            // Generate a couple of example rows
            const row1Values = fieldNames.map(field =>
                getExampleValue(fields[field])
            );
            const row2Values = fieldNames.map(field =>
                getExampleValue(fields[field], true) // alternate values
            );
            const spaces2 = '  '.repeat(indent);
            return `${header}\n${spaces2}  ${row1Values.join(',')}\n${spaces2}  ${row2Values.join(',')}`;
        } else {
            // Array of primitives
            return `[N]: ${getExampleValue(shape.element)}, ${getExampleValue(shape.element, true)}`;
        }
    }

    return getExampleValue(shape);
}

/**
 * Get an example value for a primitive type
 */
function getExampleValue(shape: SchemaShape, alternate: boolean = false): string {
    switch (shape.type) {
        case 'string':
            return alternate ? '"example2"' : '"example1"';
        case 'number':
            return alternate ? '42' : '123';
        case 'boolean':
            return alternate ? 'false' : 'true';
        case 'date':
            return alternate ? '2025-01-02T00:00:00Z' : '2025-01-01T00:00:00Z';
        case 'enum':
            if (shape.values && shape.values.length > 0) {
                return alternate && shape.values.length > 1
                    ? `"${shape.values[1]}"`
                    : `"${shape.values[0]}"`;
            }
            return '"value"';
        default:
            return alternate ? '"value2"' : '"value1"';
    }
}

/**
 * Internal type representing the shape of a schema
 */
type SchemaShape =
    | { type: 'object'; fields: Record<string, SchemaShape> }
    | { type: 'array'; element: SchemaShape }
    | { type: 'string' }
    | { type: 'number' }
    | { type: 'boolean' }
    | { type: 'date' }
    | { type: 'enum'; values?: readonly string[] };
