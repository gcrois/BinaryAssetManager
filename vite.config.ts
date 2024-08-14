import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";
import { defineConfig } from "vite";
import path from "path";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";

import packageJson from "./package.json";

const baseURL = "/WebAudioEditor/";

// https://vitejs.dev/config/
export default defineConfig({
	base: baseURL,
	optimizeDeps: {
		exclude: ["@ffmpeg/ffmpeg", "@ffmpeg/util"],
	},
	plugins: [
		wasm(),
		topLevelAwait(),
		react(),
		svgr({
			svgrOptions: {
				exportType: "named",
				ref: true,
				svgo: false,
				titleProp: true,
			},
			include: "**/*.svg",
		}),
	],
	build: {
		rollupOptions: {
			input: {
				main: "./index.html",
				popout: "./popout.html",
			},
		},
	},
	resolve: {
		alias: {
			"@src": path.resolve(__dirname, "./src"),
			"@app": path.resolve(__dirname, "./app"),
			"@assets": path.resolve(__dirname, "./app/assets"),
			"@svg": path.resolve(__dirname, "./app/assets/svg"),
		},
	},
	define: {
		"import.meta.env.VITE_BUILD_DATE": JSON.stringify(
			new Date().toISOString(),
		),
		"import.meta.env.VITE_APP_VERSION": JSON.stringify(
			process.env.npm_package_version,
		),
		"import.meta.env.VITE_PROJ_TITLE": `"${packageJson.showName || packageJson.name}"`,
		"import.meta.env.VITE_PROJ_DESCRIPTION": `"${packageJson.description}"`,
		"import.meta.env.VITE_BASE_URL": JSON.stringify(baseURL),
	},
	server: {
		headers: {
			"Cross-Origin-Opener-Policy": "same-origin",
			"Cross-Origin-Embedder-Policy": "require-corp",
		},
	},
});
