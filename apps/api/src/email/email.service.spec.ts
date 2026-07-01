import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';

// Mock resend module
const mockSend = jest.fn();
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: mockSend },
  })),
}));

describe('EmailService', () => {
  let service: EmailService;

  beforeEach(async () => {
    mockSend.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, string> = {
                RESEND_API_KEY: 'test-api-key',
                EMAIL_FROM: 'test@example.com',
                FRONTEND_URL: 'https://example.com',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendVerificationEmail', () => {
    it('should call Resend with correct params and verification link', async () => {
      mockSend.mockResolvedValue({ id: 'msg-1' });

      await service.sendVerificationEmail('user@test.com', 'abc123');

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'test@example.com',
          to: 'user@test.com',
          subject: 'Verify Your Email Address',
        }),
      );

      // HTML should contain the verification link
      const htmlArg = mockSend.mock.calls[0][0].html;
      expect(htmlArg).toContain(
        'https://example.com/verify-email?token=abc123',
      );
    });

    it('should not throw on send failure (graceful degradation)', async () => {
      mockSend.mockRejectedValue(new Error('Resend API error'));

      // Should not throw
      await expect(
        service.sendVerificationEmail('user@test.com', 'abc123'),
      ).resolves.toBeUndefined();
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should call Resend with correct params and reset link', async () => {
      mockSend.mockResolvedValue({ id: 'msg-2' });

      await service.sendPasswordResetEmail('user@test.com', 'reset456');

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'test@example.com',
          to: 'user@test.com',
          subject: 'Reset Your Password',
        }),
      );

      const htmlArg = mockSend.mock.calls[0][0].html;
      expect(htmlArg).toContain(
        'https://example.com/reset-password?token=reset456',
      );
    });

    it('should not throw on send failure (graceful degradation)', async () => {
      mockSend.mockRejectedValue(new Error('Network error'));

      await expect(
        service.sendPasswordResetEmail('user@test.com', 'reset456'),
      ).resolves.toBeUndefined();
    });
  });
});
