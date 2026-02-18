import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	turbopack: {
		root: __dirname,
	},
	experimental: {
		serverActions: {
			allowedOrigins: (process.env.NEXT_ALLOWED_ORIGINS ?? "")
				.split(",")
				.map((v) => v.trim())
				.filter(Boolean),
		},
	},
};

export default nextConfig;
