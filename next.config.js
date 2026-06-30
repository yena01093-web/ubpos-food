/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        // NICE 결제창(nicepay-pgweb.js)은 내부적으로 eval()을 사용하므로
        // /order 페이지에서 unsafe-eval 허용 필요
        source: '/order/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.nicepay.co.kr",
              "frame-src 'self' https://*.nicepay.co.kr",
              "connect-src 'self' https://*.nicepay.co.kr wss: ws:",
            ].join('; '),
          },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
};

module.exports = nextConfig;
