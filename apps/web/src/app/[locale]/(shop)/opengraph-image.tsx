import { ImageResponse } from 'next/og';
import { getSiteName } from '@/lib/site-config';

export const alt = 'IndexFinds product discovery';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: 'center',
          background:
            'radial-gradient(circle at 16% 18%, rgba(88,79,224,0.32), transparent 30%), radial-gradient(circle at 84% 78%, rgba(255,90,60,0.36), transparent 32%), linear-gradient(135deg, #11162b 0%, #171a33 100%)',
          color: 'white',
          display: 'flex',
          height: '100%',
          justifyContent: 'center',
          padding: '72px',
          width: '100%',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            maxWidth: '980px',
            width: '100%',
          }}
        >
          <div style={{ color: '#ff7651', display: 'flex', fontSize: 30, fontWeight: 700 }}>
            {getSiteName()}
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 76,
              fontWeight: 800,
              letterSpacing: '-3px',
              lineHeight: 1.04,
              marginTop: 34,
            }}
          >
            Find Chinese products. Choose how to buy.
          </div>
          <div
            style={{
              color: 'rgba(255,255,255,0.7)',
              display: 'flex',
              fontSize: 30,
              marginTop: 30,
            }}
          >
            Product discovery, source details and buying-agent guides
          </div>
        </div>
      </div>
    ),
    size,
  );
}
