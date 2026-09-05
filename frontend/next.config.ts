import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hides the floating dev indicator so demos and screenshots show only the app.
  // Compile and runtime errors are still surfaced.
  devIndicators: false,
};

export default nextConfig;
