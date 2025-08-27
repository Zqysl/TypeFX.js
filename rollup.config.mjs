import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'

const pkgName = 'TypeFX'
const input = 'dist/typefx.js'

export default [
  {
    input,
    output: {
      file: 'dist/typefx.umd.js',
      format: 'umd',
      name: pkgName,
      sourcemap: true,
    },
    plugins: [
      resolve({ browser: true }),
      commonjs(),
    ]
  }
]