import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SeoIndexReviewDto } from './status-action.dto';

describe('SeoIndexReviewDto', () => {
  it('allows an administrator to revoke indexing without review claims', async () => {
    const dto = plainToInstance(SeoIndexReviewDto, { indexable: false });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('requires all three review confirmations and a meaningful note', async () => {
    const dto = plainToInstance(SeoIndexReviewDto, {
      indexable: true,
      verified: true,
      deduplicated: false,
      uniqueValue: true,
      reviewNote: 'too short',
    });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['deduplicated', 'reviewNote']),
    );
  });

  it('accepts a complete manual indexing review', async () => {
    const dto = plainToInstance(SeoIndexReviewDto, {
      indexable: true,
      verified: true,
      deduplicated: true,
      uniqueValue: true,
      reviewNote: 'Verified source details and added a distinct comparison note.',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });
});
