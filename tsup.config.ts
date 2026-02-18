import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/cli.ts'],
  format: ['cjs', 'esm'],
  dts: { entry: ['src/index.ts'] },
  clean: true,
  splitting: false,
  sourcemap: true,
  banner: ({ format }) => {
    // Add shebang only to CJS cli output
    return { js: '' }
  },
})
