
module.exports = require('./cli-test')
  .create()
  .forProgram('angularity')
  .withDirectories('test/expected', 'test/temp')
  .withSourceFilter(/!app-*/)
  .seal();