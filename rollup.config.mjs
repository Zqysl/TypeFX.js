import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import typescript from '@rollup/plugin-typescript'
import postcss from 'rollup-plugin-postcss'

const pkgName = 'TypeFX'
const input = 'src/typefx.ts'

export default [
  {
    input,
    output: [
      {
        file: 'dist/typefx.js',
        format: 'es',
        sourcemap: true,
      },
      {
        file: 'dist/typefx.cjs',
        format: 'cjs',
        sourcemap: true,
      },
      {
        file: 'dist/typefx.umd.js',
        format: 'umd',
        name: pkgName,
        sourcemap: true,
      },
    ],
    plugins: [
      postcss({ inject: true, extract: false, minimize: true }),
      resolve({ browser: true }),
      commonjs(),
      typescript({ tsconfig: './tsconfig.json' }),
    ]
  }
]