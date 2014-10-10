var gulp = require('../index');

var task = process.argv[1];
gulp.start(gulp.hasTask(task) ? task : 'default');