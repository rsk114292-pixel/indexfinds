import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import dayjs from 'dayjs';
import TrafficAnalyticsPage from './page';

const mockGet = jest.fn();
const mockReadSessionCache = jest.fn();
const mockWriteSessionCache = jest.fn();

jest.mock('next/dynamic', () => ({
  __esModule: true,
  default: () => () => <div data-testid="dynamic-section" />,
}));

jest.mock('@/lib/api', () => ({
  get: (...args: unknown[]) => mockGet(...args),
}));

jest.mock('@/lib/session-cache', () => ({
  readSessionCache: (...args: unknown[]) => mockReadSessionCache(...args),
  writeSessionCache: (...args: unknown[]) => mockWriteSessionCache(...args),
}));

jest.mock('@/app/admin/useAdminAuthReady', () => ({
  useAdminAuthReady: () => ({ isReady: true }),
}));

jest.mock('../../components/PageSkeleton', () => ({
  DashboardSkeleton: () => <div data-testid="dashboard-skeleton" />,
}));

jest.mock('./components/SourceTable', () => ({
  __esModule: true,
  default: () => <div data-testid="source-table" />,
}));

jest.mock('./components/CampaignTable', () => ({
  __esModule: true,
  default: () => <div data-testid="campaign-table" />,
}));

jest.mock('./components/BehaviorFunnelCards', () => ({
  __esModule: true,
  default: ({
    overview,
    data,
  }: {
    overview: { highIntentVisitors: number; activatedUsers: number; effectiveNewUsers: number } | null;
    data: { effectiveUsers: number; productViewReadyUsers: number } | null;
  }) => (
    <div data-testid="behavior-funnel-overview">
      {overview && data
        ? `highIntent=${overview.highIntentVisitors};activated=${overview.activatedUsers};effective=${overview.effectiveNewUsers};path=${data.productViewReadyUsers}->${data.effectiveUsers}`
        : 'empty'}
    </div>
  ),
}));

jest.mock('./components/BehaviorFunnelSourceTable', () => ({
  __esModule: true,
  default: ({
    data,
  }: {
    data: Array<{ source: string; effectiveUsers: number }>;
  }) => (
    <div data-testid="behavior-funnel-source-table">
      {data.map((item) => `${item.source}:${item.effectiveUsers}`).join(',')}
    </div>
  ),
}));

jest.mock('./components/BehaviorFunnelDimensionTable', () => ({
  __esModule: true,
  default: ({
    title,
    data,
  }: {
    title: string;
    data: Array<{ value: string; effectiveUsers: number }>;
  }) => (
    <div data-testid="behavior-funnel-dimension-table">
      {title}:{data.map((item) => `${item.value}:${item.effectiveUsers}`).join(',')}
    </div>
  ),
}));

jest.mock('./components/BehaviorSampleTable', () => ({
  __esModule: true,
  default: ({
    title,
    data,
  }: {
    title: string;
    data: Array<{ userId: string; blocker: string }>;
  }) => (
    <div data-testid="behavior-sample-table">
      {title}:{data.map((item) => `${item.userId}:${item.blocker}`).join(',')}
    </div>
  ),
}));

jest.mock('./components/AttributionOverviewCards', () => ({
  __esModule: true,
  default: ({
    data,
  }: {
    data: { attributedRate: number; directRate: number } | null;
  }) => (
    <div data-testid="attribution-overview">
      {data ? `attributed=${data.attributedRate};direct=${data.directRate}` : 'empty'}
    </div>
  ),
}));

jest.mock('./components/EngagementOverviewCards', () => ({
  __esModule: true,
  default: ({
    data,
  }: {
    data: { avgActiveDurationMs: number; engaged30sRate: number } | null;
  }) => (
    <div data-testid="engagement-overview">
      {data
        ? `avg=${data.avgActiveDurationMs};engaged30=${data.engaged30sRate}`
        : 'empty'}
    </div>
  ),
}));

jest.mock('./components/DirectBreakdownTable', () => ({
  __esModule: true,
  default: ({
    data,
  }: {
    data: Array<{ reason: string; count: number }>;
  }) => (
    <div data-testid="direct-breakdown">
      {data.map((item) => `${item.reason}:${item.count}`).join(',')}
    </div>
  ),
}));

jest.mock('./components/SourceQualityDiagnosticsPanel', () => ({
  __esModule: true,
  default: ({
    data,
  }: {
    data: { source: string; visits: number } | null;
  }) => (
    <div data-testid="source-quality-diagnostics">
      {data ? `${data.source}:${data.visits}` : 'empty'}
    </div>
  ),
}));

jest.mock('./components/LandingPageTable', () => ({
  __esModule: true,
  default: () => <div data-testid="landing-table" />,
}));

jest.mock('./components/ActionTaskBoard', () => ({
  __esModule: true,
  default: ({
    tasks,
    onOpenView,
  }: {
    tasks: Array<{ title: string; targetView: string }>;
    onOpenView: (targetView: string) => void;
  }) => (
    <div data-testid="action-task-board">
      {tasks.map((task) => (
        <button key={task.title} type="button" onClick={() => onOpenView(task.targetView)}>
          {task.title}
        </button>
      ))}
    </div>
  ),
}));

jest.mock('./components/GrowthBriefPanel', () => ({
  __esModule: true,
  default: ({
    report,
  }: {
    report: { title: string; summary: string; sections: Array<{ title: string; points: string[] }> } | null;
  }) => (
    <div data-testid="growth-brief">
      {report
        ? `${report.title}|${report.summary}|${report.sections
            .map((section) => `${section.title}:${section.points.join(' / ')}`)
            .join('||')}`
        : 'empty'}
    </div>
  ),
}));

jest.mock('./components/CaptureDiagnosticsCards', () => ({
  __esModule: true,
  default: ({ data }: { data: { overallCaptureRate: number; eligibleCaptureRate: number } | null }) => (
    <div data-testid="capture-diagnostics">
      {data
        ? `overall=${data.overallCaptureRate};eligible=${data.eligibleCaptureRate}`
        : 'empty'}
    </div>
  ),
}));

jest.mock('./components/CaptureLossTable', () => ({
  __esModule: true,
  default: ({
    data,
  }: {
    data: Array<{ reason: string; count: number }>;
  }) => (
    <div data-testid="capture-loss">
      {data.map((item) => `${item.reason}:${item.count}`).join(',')}
    </div>
  ),
}));

jest.mock('./components/ReconciliationFunnelCards', () => ({
  __esModule: true,
  default: ({
    data,
  }: {
    data: { referralClicks: number; gaCaptureRate: number } | null;
  }) => (
    <div data-testid="reconciliation-funnel">
      {data ? `clicks=${data.referralClicks};rate=${data.gaCaptureRate}` : 'empty'}
    </div>
  ),
}));

jest.mock('./components/CaptureBreakdownTable', () => ({
  __esModule: true,
  default: ({
    dimension,
    data,
  }: {
    dimension: string;
    data: Array<{ value: string; firstPartyVisits: number }>;
  }) => (
    <div data-testid="capture-breakdown">
      {dimension}:{data.map((item) => `${item.value}:${item.firstPartyVisits}`).join(',')}
    </div>
  ),
}));

jest.mock('./components/MetricGlossaryModal', () => ({
  __esModule: true,
  default: () => <button type="button">查看指标口径</button>,
}));

jest.mock('antd', () => {
  const React = jest.requireActual('react');

  const passthrough = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;

  return {
    Row: passthrough,
    Col: passthrough,
    Alert: ({
      message,
      description,
    }: {
      message?: React.ReactNode;
      description?: React.ReactNode;
    }) => (
      <div>
        <div>{message}</div>
        <div>{description}</div>
      </div>
    ),
    Button: ({
      children,
      onClick,
      disabled,
    }: {
      children?: React.ReactNode;
      onClick?: () => void;
      disabled?: boolean;
    }) => (
      <button type="button" onClick={onClick} disabled={disabled}>
        {children}
      </button>
    ),
    DatePicker: {
      RangePicker: () => <div data-testid="range-picker" />,
    },
    Select: ({
      value,
      onChange,
    }: {
      value?: string;
      onChange?: (value: string) => void;
    }) => (
      <select
        data-testid="select"
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
      />
    ),
    Segmented: ({
      value,
      onChange,
      options,
    }: {
      value: string;
      onChange?: (value: string) => void;
      options: Array<{ label: string; value: string }>;
    }) => (
      <div>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={value === option.value}
            onClick={() => onChange?.(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    ),
    App: {
      useApp: () => ({
        message: {
          success: jest.fn(),
          warning: jest.fn(),
        },
      }),
    },
  };
});

jest.mock('@ant-design/icons', () => ({
  DownloadOutlined: () => <span>download</span>,
  ClockCircleOutlined: () => <span>clock</span>,
  FieldTimeOutlined: () => <span>field-time</span>,
  ThunderboltOutlined: () => <span>thunderbolt</span>,
  WarningOutlined: () => <span>warning</span>,
}));

describe('TrafficAnalyticsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReadSessionCache.mockReturnValue(null);

    const responses = new Map<string, unknown>([
      [
        '/admin/analytics/traffic/overview',
        {
          total: 120,
          totalChange: 20,
          uniqueSessions: 80,
          uniqueSessionsChange: 15,
          uniqueVisitors: 65,
          uniqueVisitorsChange: 10,
          totalOutboundVisits: 12,
          totalOutboundVisitsChange: 5,
          outboundVisitRate: 15,
          highIntentVisitors: 18,
          highIntentVisitorsChange: 12,
          highIntentVisitorRate: 22.5,
          activatedUsers: 12,
          activatedUsersChange: 9,
          activatedUserRate: 15,
          effectiveNewUsers: 4,
          effectiveNewUsersChange: 20,
          effectiveNewUserRate: 5,
          effectiveUsers: 4,
          effectiveUsersChange: 20,
          effectiveUserRate: 5,
          suspiciousVisitRecords: 40,
          suspiciousVisitRate: 12.5,
          topChannel: 'referral',
          topSource: 'telegram',
          period: {
            current: {
              start: '2026-03-01T00:00:00.000Z',
              end: '2026-03-07T23:59:59.999Z',
            },
            previous: {
              start: '2026-02-22T00:00:00.000Z',
              end: '2026-02-28T23:59:59.999Z',
            },
          },
        },
      ],
      [
        '/admin/analytics/traffic/engagement/overview',
        {
          totalVisits: 120,
          measuredVisits: 80,
          measurementCoverageRate: 66.67,
          avgActiveDurationMs: 18000,
          medianActiveDurationMs: 12000,
          shortStayVisits: 10,
          shortStayRate: 12.5,
          engaged10sVisits: 52,
          engaged10sRate: 65,
          engaged30sVisits: 24,
          engaged30sRate: 30,
          avgActiveBeforeOutboundMs: 15000,
        },
      ],
      ['/admin/analytics/traffic/by-channel', [{ channel: 'referral', count: 80, percentage: 66.67 }]],
      [
        '/admin/analytics/traffic/by-source',
        [
          {
            source: 'telegram',
            rawCount: 50,
            count: 40,
            uniqueVisitors: 32,
            suspiciousVisits: 3,
            suspiciousRate: 7.5,
            outboundVisits: 12,
            outboundClicks: 12,
            outboundRate: 30,
            effectiveUsers: 4,
            effectiveUserRate: 10,
          },
        ],
      ],
      [
        '/admin/analytics/traffic/by-campaign',
        [
          {
            campaign: 'referral_invite',
            source: 'telegram',
            medium: 'social',
            rawCount: 50,
            count: 40,
            uniqueVisitors: 32,
            suspiciousVisits: 3,
            suspiciousRate: 7.5,
            outboundVisits: 12,
            outboundClicks: 12,
            outboundRate: 30,
            effectiveUsers: 4,
            effectiveUserRate: 10,
          },
        ],
      ],
      [
        '/admin/analytics/traffic/by-landing-page',
        [
          {
            landingPage: '/en/products/test',
            rawCount: 50,
            count: 40,
            uniqueVisitors: 32,
            suspiciousVisits: 3,
            suspiciousRate: 7.5,
            outboundVisits: 12,
            outboundClicks: 12,
            outboundRate: 30,
            effectiveUsers: 4,
            effectiveUserRate: 10,
          },
        ],
      ],
      ['/admin/analytics/traffic/trends', [{ period: '2026-03-01', count: 20 }]],
      ['/admin/analytics/traffic/geo', [{ country: 'US', count: 30, percentage: 25 }]],
      ['/admin/analytics/traffic/devices', [{ deviceType: 'mobile', count: 70, percentage: 58.33 }]],
      [
        '/admin/analytics/traffic/capture-diagnostics/overview',
        {
          totalVisits: 120,
          consentAccepted: 90,
          consentRejected: 10,
          consentPending: 20,
          gaEligibleVisits: 80,
          gaRequested: 78,
          gaLoaded: 72,
          gaReady: 64,
          gaFirstPageviewSent: 60,
          gaEventCountTotal: 120,
          gaBlocked: 8,
          gaFailed: 4,
          gaDisabled: 14,
          inAppBrowserVisits: 35,
          overallCaptureRate: 53.33,
          eligibleCaptureRate: 80,
        },
      ],
      [
        '/admin/analytics/traffic/reconciliation/overview',
        {
          referralClicks: 150,
          landingVisits: 96,
          firstPartyVisits: 110,
          unmatchedFirstPartyVisits: 14,
          gaCaptures: 88,
          clickToLandingRate: 64,
          landingToFirstPartyRate: 87.27,
          gaCaptureRate: 80,
        },
      ],
      [
        '/admin/analytics/traffic/capture-diagnostics/breakdown',
        [
          {
            dimension: 'source',
            value: 'telegram',
            firstPartyVisits: 40,
            gaCaptures: 28,
            blockedOrFailed: 8,
            pendingConsent: 4,
            inAppBrowserVisits: 20,
            captureRate: 70,
          },
        ],
      ],
      [
        '/admin/analytics/traffic/capture-diagnostics/loss-breakdown',
        [
          { reason: 'captured', count: 64, percentage: 53.33 },
          { reason: 'consent_pending', count: 20, percentage: 16.67 },
        ],
      ],
      [
        '/admin/analytics/traffic/attribution-quality/overview',
        {
          totalVisits: 80,
          attributedVisits: 58,
          attributedRate: 72.5,
          utmTaggedVisits: 34,
          utmCoverageRate: 42.5,
          referrerTaggedVisits: 28,
          referrerCoverageRate: 35,
          directVisits: 22,
          directRate: 27.5,
          referralShareUnattributedVisits: 8,
          referralShareUnattributedRate: 10,
          webviewReferrerLossVisits: 6,
          webviewReferrerLossRate: 7.5,
          likelyAutomatedDirectVisits: 4,
          likelyAutomatedDirectRate: 5,
          trueDirectVisits: 5,
          trueDirectRate: 6.25,
          otherUnattributedVisits: 3,
          otherUnattributedRate: 3.75,
        },
      ],
      [
        '/admin/analytics/traffic/attribution-quality/direct-breakdown',
        [
          {
            reason: 'referral_share_unattributed',
            rawCount: 10,
            count: 8,
            uniqueVisitors: 7,
            shareOfDirect: 36.36,
            shareOfTotal: 10,
          },
          {
            reason: 'webview_referrer_loss',
            rawCount: 8,
            count: 6,
            uniqueVisitors: 5,
            shareOfDirect: 27.27,
            shareOfTotal: 7.5,
          },
        ],
      ],
      [
        '/admin/analytics/traffic/attribution-quality/source-diagnostics',
        {
          source: 'indexfinds.com',
          rawCount: 55,
          visits: 44,
          uniqueVisitors: 40,
          repeatVisitRate: 20,
          outboundVisits: 12,
          outboundRate: 27.27,
          effectiveUsers: 2,
          effectiveUserRate: 4.55,
          avgProductViewsPerVisitor: 1.8,
          oneVisitDeviceRate: 85,
          concentration: {
            distinctDevices: 40,
            distinctIpAddresses: 30,
            distinctBrowsers: 12,
            topDeviceShare: 4.55,
            topIpShare: 10,
            topBrowser: 'chrome',
            topBrowserShare: 50,
          },
          landingPages: [
            { landingPage: '/en/products/demo', visits: 20, share: 45.45 },
          ],
        },
      ],
      [
        '/admin/analytics/traffic/behavior-funnel/overview',
        {
          visits: 80,
          registrations: 10,
          verifiedUsers: 8,
          productViewReadyUsers: 5,
          actionReadyUsers: 6,
          effectiveUsers: 4,
          visitToRegistrationRate: 12.5,
          registrationToVerificationRate: 80,
          verificationToProductViewRate: 62.5,
          productViewToEffectiveRate: 80,
          visitToEffectiveRate: 5,
          blockers: {
            anonymousOrUnregisteredVisits: 70,
            unverifiedUsers: 2,
            insufficientProductViews: 3,
            missingAction: 1,
          },
        },
      ],
      [
        '/admin/analytics/traffic/behavior-funnel/by-source',
        [
          {
            source: 'telegram',
            visits: 40,
            registrations: 8,
            verifiedUsers: 6,
            productViewReadyUsers: 4,
            actionReadyUsers: 5,
            effectiveUsers: 3,
            visitToRegistrationRate: 20,
            registrationToEffectiveRate: 37.5,
            visitToEffectiveRate: 7.5,
          },
        ],
      ],
      [
        '/admin/analytics/traffic/behavior-funnel/by-campaign',
        [
          {
            dimension: 'campaign',
            value: 'referral_invite',
            visits: 40,
            registrations: 8,
            verifiedUsers: 6,
            productViewReadyUsers: 4,
            actionReadyUsers: 5,
            effectiveUsers: 3,
            visitToRegistrationRate: 20,
            registrationToEffectiveRate: 37.5,
            visitToEffectiveRate: 7.5,
          },
        ],
      ],
      [
        '/admin/analytics/traffic/behavior-funnel/by-landing-page',
        [
          {
            dimension: 'landingPage',
            value: '/en/products/test',
            visits: 40,
            registrations: 8,
            verifiedUsers: 6,
            productViewReadyUsers: 4,
            actionReadyUsers: 5,
            effectiveUsers: 3,
            visitToRegistrationRate: 20,
            registrationToEffectiveRate: 37.5,
            visitToEffectiveRate: 7.5,
          },
        ],
      ],
      [
        '/admin/analytics/traffic/behavior-funnel/source-samples',
        [
          {
            userId: 'user-1',
            email: 'a@example.com',
            latestVisitAt: '2026-03-20T12:00:00.000Z',
            landingPage: '/en/products/test',
            campaign: 'referral_invite',
            registered: true,
            emailVerified: true,
            productViews: 2,
            actionReady: false,
            effectiveUser: false,
            blocker: 'insufficient_product_views',
          },
        ],
      ],
      [
        '/admin/analytics/traffic/behavior-funnel/campaign-samples',
        [
          {
            userId: 'user-2',
            email: 'b@example.com',
            latestVisitAt: '2026-03-21T12:00:00.000Z',
            landingPage: '/en/products/test',
            campaign: 'referral_invite',
            registered: true,
            emailVerified: false,
            productViews: 1,
            actionReady: false,
            effectiveUser: false,
            blocker: 'unverified',
          },
        ],
      ],
      [
        '/admin/analytics/traffic/behavior-funnel/landing-page-samples',
        [
          {
            userId: 'user-3',
            email: 'c@example.com',
            latestVisitAt: '2026-03-22T12:00:00.000Z',
            landingPage: '/en/products/test',
            campaign: null,
            registered: true,
            emailVerified: true,
            productViews: 4,
            actionReady: false,
            effectiveUser: false,
            blocker: 'missing_action',
          },
        ],
      ],
    ]);

    mockGet.mockImplementation((path: string) => Promise.resolve(responses.get(path)));
  });

  it('defaults to an operator-first view and still exposes capture diagnostics on demand', async () => {
    render(<TrafficAnalyticsPage />);

    expect(screen.getByTestId('dashboard-skeleton')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('先看经营结果，再看原因')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByTestId('source-table')).toBeInTheDocument();
    });

    expect(mockGet).toHaveBeenCalledWith(
      '/admin/analytics/traffic/overview',
      expect.objectContaining({ scope: 'customer' }),
    );
    expect(screen.getByRole('button', { name: '查看指标口径' })).toBeInTheDocument();
    expect(
      screen.getByText(/默认排除内部 channel 与已登录 admin \/ super_admin/),
    ).toBeInTheDocument();
    expect(screen.getByText('建议加预算')).toBeInTheDocument();
    expect(screen.getByTestId('growth-brief')).toHaveTextContent('自动增长简报');
    expect(screen.getByTestId('growth-brief')).toHaveTextContent(
      '本周期共获得 80 次去重访问，形成 18 个高意向访客、12 个激活用户，以及 4 个有效新用户',
    );
    expect(screen.getByTestId('growth-brief')).toHaveTextContent(
      'Telegram 是当前最强来源',
    );
    expect(screen.getByTestId('growth-brief')).toHaveTextContent(
      '直接/未归因访问占比 27.5%',
    );
    expect(screen.getByTestId('growth-brief')).toHaveTextContent(
      '1. 扩量 Telegram 来源',
    );
    expect(screen.getByTestId('action-task-board')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '扩量 Telegram 来源' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '补齐分享与 WebView 归因' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '提升商品浏览深度' })).toBeInTheDocument();
    expect(screen.queryByTestId('capture-diagnostics')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '原始口径' }));
    await waitFor(() =>
      expect(mockGet).toHaveBeenCalledWith(
        '/admin/analytics/traffic/overview',
        expect.objectContaining({ scope: 'raw' }),
      ),
    );
    expect(screen.getByText(/包含内部访问和管理员前台访问/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '补齐分享与 WebView 归因' }));

    await waitFor(() => {
      expect(screen.getByTestId('attribution-overview')).toHaveTextContent(
        'attributed=72.5;direct=27.5',
      );
    });

    expect(screen.queryByTestId('growth-brief')).not.toBeInTheDocument();
    expect(screen.queryByTestId('action-task-board')).not.toBeInTheDocument();
    expect(screen.getByText('归因速览')).toBeInTheDocument();
    expect(screen.getByTestId('direct-breakdown')).toHaveTextContent(
      'referral_share_unattributed:8,webview_referrer_loss:6',
    );

    fireEvent.click(screen.getByRole('button', { name: '行为诊断' }));

    await waitFor(() => {
      expect(screen.getByTestId('behavior-funnel-overview')).toHaveTextContent(
        'highIntent=18;activated=12;effective=4;path=5->4',
      );
    });

    expect(screen.getByText('行为诊断速览')).toBeInTheDocument();
    expect(screen.getByText('先按对象看三类指标')).toBeInTheDocument();
    expect(screen.getByText(/优先修复 浏览深度断点/)).toBeInTheDocument();
    expect(screen.getByText('来源 / Campaign / 落地页归因已从本视图移出')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '采集对账' }));

    await waitFor(() => {
      expect(screen.getByTestId('capture-diagnostics')).toHaveTextContent(
        'overall=53.33;eligible=80',
      );
    });

    expect(screen.getByText('采集速览')).toBeInTheDocument();
    expect(
      screen.getByText(/当前窗口内有 35 次访问来自内置浏览器/),
    ).toBeInTheDocument();
    expect(screen.getByTestId('reconciliation-funnel')).toHaveTextContent(
      'clicks=150;rate=80',
    );
    await waitFor(() => {
      expect(screen.getByTestId('capture-breakdown')).toHaveTextContent(
        'source:telegram:40',
      );
    });
    expect(screen.getByTestId('capture-loss')).toHaveTextContent(
      'captured:64,consent_pending:20',
    );
    expect(mockWriteSessionCache).toHaveBeenCalled();
  });

  it('defaults the initial traffic request to today only', async () => {
    render(<TrafficAnalyticsPage />);

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        '/admin/analytics/traffic/overview',
        expect.objectContaining({
          startDate: expect.any(String),
          endDate: expect.any(String),
        }),
      );
    });

    const overviewCall = mockGet.mock.calls.find(
      ([path]) => path === '/admin/analytics/traffic/overview',
    );
    const params = overviewCall?.[1] as {
      startDate: string;
      endDate: string;
    };
    const today = dayjs().format('YYYY-MM-DD');

    expect(dayjs(params.startDate).format('YYYY-MM-DD')).toBe(today);
    expect(dayjs(params.endDate).format('YYYY-MM-DD')).toBe(today);
  });

  it('requests the new capture diagnostics endpoints alongside the traffic data', async () => {
    render(<TrafficAnalyticsPage />);

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        '/admin/analytics/traffic/capture-diagnostics/overview',
        expect.objectContaining({
          startDate: expect.any(String),
          endDate: expect.any(String),
        }),
      );
    });

    expect(mockGet).toHaveBeenCalledWith(
      '/admin/analytics/traffic/capture-diagnostics/loss-breakdown',
      expect.objectContaining({
        startDate: expect.any(String),
        endDate: expect.any(String),
      }),
    );
    expect(mockGet).toHaveBeenCalledWith(
      '/admin/analytics/traffic/reconciliation/overview',
      expect.objectContaining({
        startDate: expect.any(String),
        endDate: expect.any(String),
      }),
    );
    expect(mockGet).toHaveBeenCalledWith(
      '/admin/analytics/traffic/attribution-quality/overview',
      expect.objectContaining({
        startDate: expect.any(String),
        endDate: expect.any(String),
      }),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(mockGet).toHaveBeenCalledWith(
      '/admin/analytics/traffic/attribution-quality/direct-breakdown',
      expect.objectContaining({
        startDate: expect.any(String),
        endDate: expect.any(String),
      }),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(mockGet).toHaveBeenCalledWith(
      '/admin/analytics/traffic/attribution-quality/source-diagnostics',
      expect.objectContaining({
        startDate: expect.any(String),
        endDate: expect.any(String),
        source: 'indexfinds.com',
      }),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(mockGet).toHaveBeenCalledWith(
      '/admin/analytics/traffic/behavior-funnel/overview',
      expect.objectContaining({
        startDate: expect.any(String),
        endDate: expect.any(String),
      }),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(mockGet).not.toHaveBeenCalledWith(
      '/admin/analytics/traffic/behavior-funnel/by-source',
      expect.anything(),
    );
    expect(mockGet).not.toHaveBeenCalledWith(
      '/admin/analytics/traffic/behavior-funnel/by-campaign',
      expect.anything(),
    );
    expect(mockGet).not.toHaveBeenCalledWith(
      '/admin/analytics/traffic/behavior-funnel/by-landing-page',
      expect.anything(),
    );
    expect(mockGet).not.toHaveBeenCalledWith(
      '/admin/analytics/traffic/behavior-funnel/source-samples',
      expect.anything(),
    );
    expect(mockGet).not.toHaveBeenCalledWith(
      '/admin/analytics/traffic/behavior-funnel/campaign-samples',
      expect.anything(),
    );
    expect(mockGet).not.toHaveBeenCalledWith(
      '/admin/analytics/traffic/behavior-funnel/landing-page-samples',
      expect.anything(),
    );
    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        '/admin/analytics/traffic/capture-diagnostics/breakdown',
        expect.objectContaining({
          startDate: expect.any(String),
          endDate: expect.any(String),
          dimension: 'source',
        }),
      );
    });
  });
});
