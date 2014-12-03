var _ = require('lodash');
var gulpUtil = require('gulp-util');
var colors = gulpUtil.colors;

var help = {};

var HelpCommand = {
  name       : '',
  description: '',
  examples   : [],
  arguments  : []
};

var commands = [];

/**
 * Add a new entry for the help menu.
 *
 * @param command {HelpCommand}
 */
help.addCommand = function (command) {
  commands.push(command);
};

help.displayHelp = function () {

  _.forEach(commands, function(command) {
      console.log('');
      console.log(colors.red(command.name));
      console.log(colors.white(command.description));

      _.forEach(command.examples, function(example) {
        console.log('angularity', colors.white(example));
      });

      _.forEach(command.arguments, function(argument) {
        console.log('');
        console.log(colors.red(argument.name));
        console.log(colors.white(argument.description));

        _.forEach(argument.examples, function(example) {
          console.log('angularity', colors.white(example));
        });
      });
  });

};

help.addCommand(
  {
    name       : 'build',
    description: 'The build command will compile the project and it\'s assets to the build directory.',
    examples   : ['build'],
    arguments  : [
      {
        name       : 'nominify',
        description: 'Disable the minification of the project\'s javascript.',
        examples   : ['build nominify']
      }
    ]
  }
);


//{
//  name       : 'nominify',
//    description: 'Enable the browser sync watch task to recompile the project when changes are saved to ' +
//'the disk.',
//  examples   : ['build watch']
//}

module.exports = help;