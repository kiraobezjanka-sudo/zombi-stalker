import type { NextConfig } from 'next';

const githubPagesBasePath = process.env.GITHUB_PAGES_BASE_PATH ?? '';

const nextConfig: NextConfig = {
  output: 'export',
  assetPrefix: githubPagesBasePath || undefined,
  trailingSlash: true,
};

export default nextConfig;
