import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Seora — Analyse, réécrit et adapte ton CV';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '40px',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              background: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
              fontWeight: 900,
              color: '#6366f1',
            }}
          >
            S
          </div>
          <span style={{ fontSize: '48px', fontWeight: 800, color: 'white' }}>Seora</span>
        </div>
        <div
          style={{
            fontSize: '52px',
            fontWeight: 800,
            color: 'white',
            textAlign: 'center',
            lineHeight: 1.2,
            maxWidth: '900px',
          }}
        >
          Analyse, réécrit et adapte ton CV à chaque offre.
        </div>
        <div
          style={{
            fontSize: '24px',
            color: 'rgba(255,255,255,0.8)',
            marginTop: '24px',
            textAlign: 'center',
          }}
        >
          Score ATS • Lettre de motivation • Humanizer IA
        </div>
      </div>
    ),
    { ...size }
  );
}
