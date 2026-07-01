import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateBatchJobDto } from './create-batch-job.dto';

describe('CreateBatchJobDto', () => {
  it('应通过：包含有效 URL', async () => {
    const dto = plainToInstance(CreateBatchJobDto, {
      urls: ['https://weidian.com/item/123'],
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('应失败：空数组', async () => {
    const dto = plainToInstance(CreateBatchJobDto, {
      urls: [],
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    const messages = errors.flatMap((e) => Object.values(e.constraints || {}));
    expect(messages.some((m) => m.includes('至少需要一个'))).toBe(true);
  });

  it('应失败：无效 URL', async () => {
    const dto = plainToInstance(CreateBatchJobDto, {
      urls: ['not-a-url'],
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
