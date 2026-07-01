import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateProductSourcingRequestDto } from './create-product-sourcing-request.dto';

describe('CreateProductSourcingRequestDto', () => {
  const toDto = (data: Record<string, unknown>) =>
    plainToInstance(CreateProductSourcingRequestDto, data);

  it('accepts localhost image URLs for development uploads', async () => {
    const dto = toDto({
      productName: 'Nike Shox TL Black',
      description: 'Need this pair',
      imageUrls: ['http://localhost:4101/uploads/example.jpg'],
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('rejects non-http image URLs such as blob previews', async () => {
    const dto = toDto({
      productName: 'Nike Shox TL Black',
      description: 'Need this pair',
      imageUrls: ['blob:http://localhost:3101/preview-id'],
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'imageUrls')).toBe(true);
  });
});
