import { BadRequestException, Injectable, type PipeTransform } from '@nestjs/common';
import { type ZodType } from 'zod';

@Injectable()
export class ZodValidationPipe<TSchema extends ZodType> implements PipeTransform {
  constructor(private readonly schema: TSchema) {}

  transform(value: unknown): unknown {
    const result = this.schema.safeParse(value);
    if (result.success) {
      return result.data;
    }

    const messages = result.error.issues.map((issue) => {
      const path = issue.path.length > 0 ? `${issue.path.join('.')}: ` : '';
      return `${path}${issue.message}`;
    });

    throw new BadRequestException({
      statusCode: 400,
      error: 'Bad Request',
      message: messages,
    });
  }
}
