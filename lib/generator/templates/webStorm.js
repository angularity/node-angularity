'use strict';

var path = require('path');

var ideTemplate = require('ide-template');
var generator = require('../generator').util;

var webStorm = {};

webStorm.copyFileTemplates = function (javascriptTarget) {
  var templateFolder = path.join(generator.commonTemplatesPath, 'idea', 'fileTemplates', javascriptTarget);
  ideTemplate.webStorm.copyFileTemplates(templateFolder);
};

/**
 * Windows did not let the global npm bin command angularity work the same way as Mac,
 * if you know a way to do the same for both please submit a pull request.
 *
 * @param parameters
 * @returns {*}
 */
webStorm.generateAngularityWebStormTools = function getExternalToolContext() {
  var context = {
    name : 'Angularity',
    tools: [
      angularityToolNode('watch'),
      angularityToolNode('watch nominify'),
      angularityToolNode('build'),
      angularityToolNode('build nominify'),
      angularityToolNode('release')
    ]
  };

  var toolContent = ideTemplate.webStorm.createExternalTool(context);
  ideTemplate.webStorm.writeExternalTool(toolContent, 'Angularity.xml');
};

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
    exec               : angularityExecParam(parameters),
    filter             : [
      {
        name : 'NAME',
        value: 'File'
      },
      {
        name : 'DESCRIPTION',
        value: 'Match the standard console output to make error messages clickable.'
      },
      {
        name : 'REGEXP',
        value: '$FILE_PATH$\\:$LINE$\\:$COLUMN$'
      }
    ]
  };
}

function angularityExecParam(parameters) {

  if (ideTemplate.platform === 'windows') {
    return [
      {
        name : 'COMMAND',
        value: 'C:\\Program Files (x86)\\nodejs\\node.exe'
      },
      {
        name : 'PARAMETERS',
        value: process.env.USERPROFILE + '\\AppData\\Roaming\\npm\\node_modules\\angularity\\bin\\cli.js ' + parameters
      },
      {
        name : 'WORKING_DIRECTORY',
        value: '$ProjectFileDir$'
      }
    ];
  } else {
    return [
      {
        name : 'COMMAND',
        value: 'angularity'
      },
      {
        name : 'PARAMETERS',
        value: parameters
      },
      {
        name : 'WORKING_DIRECTORY',
        value: '$ProjectFileDir$'
      }
    ];
  }
}

module.exports = webStorm;