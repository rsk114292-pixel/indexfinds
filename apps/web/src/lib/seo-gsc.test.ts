import {
  parseCsvRows,
  parseGscPageMetricsCsv,
  parseSeoLandingGscSnapshot,
  serializeSeoLandingGscSnapshot,
} from './seo-gsc';

describe('seo gsc helpers', () => {
  it('parses csv rows with quoted commas', () => {
    expect(parseCsvRows('Page,Clicks\n"/en/a,b",12')).toEqual([
      ['Page', 'Clicks'],
      ['/en/a,b', '12'],
    ]);
  });

  it('parses english gsc page metrics exports', () => {
    const csv = `Page,Clicks,Impressions,CTR,Position
https://example.com/en/cnfans-spreadsheet,10,200,5%,3.4
https://example.com/en/cnfans-spreadsheet/shoes,4,100,4%,6.2`;

    expect(parseGscPageMetricsCsv(csv)).toEqual([
      {
        page: 'https://example.com/en/cnfans-spreadsheet',
        clicks: 10,
        impressions: 200,
        ctr: 5,
        position: 3.4,
      },
      {
        page: 'https://example.com/en/cnfans-spreadsheet/shoes',
        clicks: 4,
        impressions: 100,
        ctr: 4,
        position: 6.2,
      },
    ]);
  });

  it('parses localized gsc exports', () => {
    const csv = `网页,点击次数,展示,CTR,平均排名
https://example.com/zh/mulebuy-spreadsheet,8,300,2.5%,7.8`;

    expect(parseGscPageMetricsCsv(csv)).toEqual([
      {
        page: 'https://example.com/zh/mulebuy-spreadsheet',
        clicks: 8,
        impressions: 300,
        ctr: 2.5,
        position: 7.8,
      },
    ]);
  });

  it('returns empty rows when required headers are missing', () => {
    expect(parseGscPageMetricsCsv('Query,Clicks\ncnfans,10')).toEqual([]);
  });

  it('serializes and parses stored landing snapshots', () => {
    const serialized = serializeSeoLandingGscSnapshot({
      uploadedAt: '2026-03-19T10:00:00.000Z',
      sourceLabel: 'search-console-pages.csv',
      rows: [
        {
          key: '/cnfans-spreadsheet',
          landingPage: '/cnfans-spreadsheet',
          pageType: 'platform',
          platformName: 'CNFans',
          topicName: null,
          clicks: 10,
          impressions: 200,
          ctr: 5,
          position: 3.4,
        },
      ],
    });

    expect(parseSeoLandingGscSnapshot(serialized)).toEqual({
      uploadedAt: '2026-03-19T10:00:00.000Z',
      sourceLabel: 'search-console-pages.csv',
      rows: [
        {
          key: '/cnfans-spreadsheet',
          landingPage: '/cnfans-spreadsheet',
          pageType: 'platform',
          platformName: 'CNFans',
          topicName: null,
          clicks: 10,
          impressions: 200,
          ctr: 5,
          position: 3.4,
        },
      ],
    });
  });

  it('rejects invalid stored snapshots', () => {
    expect(parseSeoLandingGscSnapshot('{"rows":[{"landingPage":"/cnfans-spreadsheet"}]}')).toBeNull();
  });
});
