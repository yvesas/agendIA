import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';

import { ZodValidationPipe } from './zod-validation.pipe';

describe('ZodValidationPipe', () => {
  const schema = z.object({
    name: z.string().min(3, 'Nome curto'),
    age: z.number().int().positive(),
  });

  it('returns the parsed value when the input is valid', () => {
    const pipe = new ZodValidationPipe(schema);

    const result = pipe.transform({ name: 'Yves', age: 30 });

    expect(result).toEqual({ name: 'Yves', age: 30 });
  });

  it('strips unknown keys when the schema is strict about them (default passthrough)', () => {
    const strict = schema.strict();
    const pipe = new ZodValidationPipe(strict);

    expect(() => pipe.transform({ name: 'Yves', age: 30, extra: true })).toThrow(
      BadRequestException,
    );
  });

  it('throws BadRequestException with messages annotated by the field path', () => {
    const pipe = new ZodValidationPipe(schema);

    try {
      pipe.transform({ name: 'Ab', age: -1 });
      fail('pipe should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      const response = (error as BadRequestException).getResponse() as {
        statusCode: number;
        error: string;
        message: string[];
      };
      expect(response.statusCode).toBe(400);
      expect(response.error).toBe('Bad Request');
      expect(response.message).toEqual(
        expect.arrayContaining([expect.stringMatching(/^name: /), expect.stringMatching(/^age: /)]),
      );
    }
  });

  it('omits the path prefix for top-level refine errors', () => {
    const refined = z
      .object({ a: z.string().optional(), b: z.string().optional() })
      .refine((value) => value.a !== undefined || value.b !== undefined, {
        message: 'pelo menos um',
      });
    const pipe = new ZodValidationPipe(refined);

    try {
      pipe.transform({});
      fail('pipe should have thrown');
    } catch (error) {
      const response = (error as BadRequestException).getResponse() as { message: string[] };
      expect(response.message).toContain('pelo menos um');
    }
  });

  it('reports missing required fields as undefined, not silently passing', () => {
    const pipe = new ZodValidationPipe(schema);

    expect(() => pipe.transform({})).toThrow(BadRequestException);
  });
});
