import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App } from 'antd';
import { ReferralRewardsHub } from './ReferralRewardsHub';
import { copyToClipboard } from '@/lib/referral';

jest.mock('next-intl', () => ({
  useLocale: () => 'en',
}));

jest.mock('antd', () => ({
  App: {
    useApp: jest.fn(),
  },
}));

jest.mock('@/components/share/ShareChannelGrid', () => ({
  ShareChannelGrid: () => null,
}));

jest.mock('@/lib/referral', () => ({
  copyToClipboard: jest.fn(),
  generateShareUrl: jest.fn((code: string) => `http://localhost:3101/r/${code}`),
  generateTrackedShareUrl: jest.fn(
    (code: string) =>
      `http://localhost:3101/r/${code}?utm_source=referral_link&utm_medium=referral&utm_campaign=referral_invite`,
  ),
}));

jest.mock('@/lib/referral-experiment', () => ({
  trackReferralExperimentEvent: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/api', () => ({
  post: jest.fn().mockResolvedValue(undefined),
}));

describe('ReferralRewardsHub', () => {
  const successMessage = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (App.useApp as jest.Mock).mockReturnValue({
      message: {
        success: successMessage,
        error: jest.fn(),
      },
    });
    (copyToClipboard as jest.Mock).mockResolvedValue(true);
  });

  it('copies the tracked referral URL for the main copy CTA', async () => {
    render(
      <ReferralRewardsHub
        code="CAHXBV"
        totalClicks={0}
        totalRegistrations={0}
        totalConversions={0}
        totalEarnings={0}
        pointsBalance={0}
        placement="referral_page"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Copy invite link' }));

    await waitFor(() => {
      expect(copyToClipboard).toHaveBeenCalledWith(
        'http://localhost:3101/r/CAHXBV?utm_source=referral_link&utm_medium=referral&utm_campaign=referral_invite',
      );
    });
  });
});
