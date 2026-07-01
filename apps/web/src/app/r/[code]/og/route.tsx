import { ImageResponse } from 'next/og';
import { getSiteName } from '@/lib/site-config';

export const runtime = 'edge';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fff',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', fontSize: 48, fontWeight: 'bold', color: '#1a1a1a' }}>
          {getSiteName()}
        </div>
        <div style={{ display: 'flex', fontSize: 28, color: '#666', marginTop: 20 }}>
          You&#39;re invited to join!
        </div>
        <div
          style={{
            display: 'flex',
            marginTop: 30,
            padding: '12px 40px',
            backgroundColor: '#f97316',
            color: '#fff',
            fontSize: 24,
            borderRadius: 12,
          }}
        >
          Sign up &amp; get $1 bonus
        </div>
        <div style={{ display: 'flex', fontSize: 18, color: '#999', marginTop: 20 }}>
          {`Use code: ${code}`}
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
