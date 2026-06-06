import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ubpos KDS',
};

export default function KdsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: '#0f172a', minHeight: '100dvh' }}>
      {children}
    </div>
  );
}
