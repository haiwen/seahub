const webpack = require('webpack')
const config = require('../config/webpack.prod')
const ora = require('ora')

const spinner = ora('building...').start()

webpack(config, (err, stats) => {

  spinner.stop()
  if (err) throw err

  console.log(stats.toString({
    colors: true,
    modules: false,
    children: false,
    chunks: false,
    chunkModules: false
  }) + '\n\n')

  if (stats.hasErrors()) {
    console.log('  Build failed with errors.\n')
    process.exit(1)
  }

  console.log('  Build complete.\n')
})
