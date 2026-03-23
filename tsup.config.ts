import { defineConfig } from 'tsup';

export default defineConfig({
	entry: ['src/index.ts', 'src/client/commands/*.ts', 'src/client/events/*.ts'],
	platform: 'node',
	format: 'esm',
	target: 'esnext',
	skipNodeModulesBundle: true,
	clean: true,
	shims: true,
	cjsInterop: true,
	minify: false,
	terserOptions: {
		mangle: false,
		keep_classnames: true,
		keep_fnames: true,
	},
	splitting: false,
	keepNames: true,
	sourcemap: true,
	treeshake: false,
	outDir: 'dist',
});
