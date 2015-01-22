'use strict';

var path = require('path');

var ideTemplate     = require('ide-template');

/**
 * Using the generator's ./templates/idea/fileTemplates/<javascriptTarget>
 * recursively copy the file templates to the local user's webstorm preferences folder.
 * @param javascriptTarget
 * @returns {*|string}
 */
function copyFileTemplates(javascriptTarget) {
  var templateFolder = path.join(require('../lib/generator/generator').util.templatesPath(), 'idea', 'fileTemplates', javascriptTarget);
  ideTemplate.webStorm.copyFileTemplates(templateFolder);
  return templateFolder
}

/**
 * Windows did not let the global npm bin command angularity work the same way as Mac,
 * if you know a way to do the same for both please submit a pull request.
 *
 * @param parameters
 * @returns {*}
 */
function generateAngularityWebStormTools() {
  var context = {
    name : 'Angularity',
    tools: [
      angularityToolNode('test'),
      angularityToolNode('watch'),
      angularityToolNode('watch nominify'),
      angularityToolNode('build'),
      angularityToolNode('build nominify'),
      angularityToolNode('release')
    ]
  };

  var toolContent = ideTemplate.webStorm.createExternalTool(context);
  ideTemplate.webStorm.writeExternalTool(toolContent, 'Angularity.xml');
}

/**
 * Generate an external build command object for an Angularity External tool entry.
 * The commands support Windows and Unix through angularityExecParam().
 * @param parameters
 * @returns {}
 */
function angularityToolNode(parameters) {
  return {
    name               : parameters,
    showInMainMenu     : 'true',
    showInEditor       : 'true',
    showInProject      : 'true',
    showInSearchPopup  : 'true',
    disabled           : 'false',
    useConsole         : 'true',
    showConsoleOnStdOut: 'false',
    showConsoleOnStdErr: 'false',
    synchronizeAfterRun: 'true',
    exec               : [ {
        name : 'COMMAND',
        value: 'angularity.cmd'
      }, {
        name : 'PARAMETERS',
        value: parameters
      }, {
        name : 'WORKING_DIRECTORY',
        value: '$ProjectFileDir$'
      } ],
    filter             : [ {
        name : 'NAME',
        value: 'File'
      }, {
        name : 'DESCRIPTION',
        value: 'Match the standard console output to make error messages clickable.'
      }, {
        name : 'REGEXP',
        value: '$FILE_PATH$\\:$LINE$\\:$COLUMN$'
      } ]
  };
}

module.exports = {
  generateAngularityWebStormTools: generateAngularityWebStormTools,
  copyFileTemplates              : copyFileTemplates
};