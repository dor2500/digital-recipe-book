/** @type {import('next').NextConfig} */
const nextConfig = {
  // react-pageflip creates its engine in an effect and does not tear it down
  // cleanly, so StrictMode's dev-only double mount leaves a ghost page stuck
  // mid-flip. Production is unaffected either way.
  reactStrictMode: false,
};

export default nextConfig;
