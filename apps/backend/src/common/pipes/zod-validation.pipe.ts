import { PipeTransform, ArgumentMetadata, BadRequestException, Injectable } from '@nestjs/common';
import { ZodSchema } from 'zod';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: any, metadata: ArgumentMetadata) {
    if (metadata.type !== 'body' && metadata.type !== 'query') {
      return value;
    }

    try {
      return this.schema.parse(value);
    } catch (error: any) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: error?.errors,
      });
    }
  }
}
