// GITHUB_PAGES=true builds a static site into ./out for
// https://<user>.github.io/<repo>/ (see README).
const pages = process.env.GITHUB_PAGES === "true";
const basePath = pages ? process.env.PAGES_BASE_PATH || "/digital-recipe-book" : "";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // react-pageflip creates its engine in an effect and does not tear it down
  // cleanly, so StrictMode's dev-only double mount leaves a ghost page stuck
  // mid-flip. Production is unaffected either way.
  reactStrictMode: false,
  // Separate folder so a Pages build never clobbers a running dev server;
  // with output: "export" Next writes the finished site there.
  ...(pages && { output: "export", basePath, trailingSlash: true, distDir: "out" }),
};

export default nextConfig;
