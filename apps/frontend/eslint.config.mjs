import nextPlugin from '@next/eslint-plugin-next';
import nextConfig from '@nkc/eslint-config/next';

export default [...nextConfig, nextPlugin.flatConfig.coreWebVitals];
