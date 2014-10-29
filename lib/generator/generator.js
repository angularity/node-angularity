(function () {
    /* globals cd, cp, mkdir, exec, console, process, __dirname */
    'use strict';

    var fs = require('fs'),
        path = require('path'),
        _ = require('lodash');

    require('shelljs/global');

    var projectsPath = path.join(__dirname, 'projects');
    var angularityConfigTemplate = path.join(__dirname, 'templates', 'angularity.json');
    var projects = [];

    function GeneratorProject(type) {

        var projectTypePath = path.join(__dirname, 'projects', type);
        var defaultProjectName = 'angularity-project';

        if (!fs.existsSync(projectTypePath))
            console.error('Error there does not seem to be a project with the name', type);

        return {
            projectType    : type,
            projectName    : defaultProjectName,
            projectTypePath: projectTypePath,
            templatePath   : path.join(__dirname, 'projects', type, 'template'),
            destination    : path.join(String(process.cwd()), defaultProjectName),

            copyProjectTemplateFiles: function () {
                cpR(this.templatePath, this.destination, true);
            },

            createJSHint: function () {
                var hintFolder = path.resolve(__dirname, '../../');
                hintFolder = path.join(hintFolder, '.jshintrc');
                cp(hintFolder, this.destination);
            },

            createAngularityConfig: function (override) {
                var context = {
                    name                  : this.projectName,
                    version               : '0.0.1',
                    serverHttpPort        : 9000,
                    javascriptVersion     : 'es5',
                    webstormExecutablePath: '',
                    minify                : false
                };

                var angularConfigTemplate = fs.readFileSync(angularityConfigTemplate);

                if (typeof override !== 'undefined')
                    context = _.merge(context, override);

                var configFileContent = _.template(angularConfigTemplate, context);
                fs.writeFileSync(path.join(this.destination, 'angularity.json'), configFileContent, 'utf8');
            }
        };
    }

    function validProject(projectPath) {
        return fs.existsSync(path.join(projectPath, 'index.js'));
    }

    function listProjects() {
        var existingProjects = [];
        var projectsDirectory = fs.readdirSync(String(projectsPath));
        _.forEach(projectsDirectory, function (project) {
            if (validProject(path.join(projectsPath, project)))
                existingProjects.push(project);
        });

        projects = existingProjects;
        return projects;
    }

    function requireProjects() {
        listProjects();

        _.forEach(projects, function (project) {
            require('.' + path.sep + path.join('projects', project, 'index'));
        });
    }

    /**
     * Copy a directory recursively to a given destination.
     *
     * @param source
     * @param destination
     * @param contents {Boolean} if true do not copy the root folder of the source path,
     *                           instead just copy it's contents.
     */
    function cpR(source, destination, contents)
    {
        contents = contents || false;

        if (!fs.existsSync(destination))
            mkdir('-p', destination);

        if (contents) {
            var originalCWD = process.cwd();
            cd(source);
            cp('-R', '.', destination);
            cd(String(originalCWD));
        } else
            cp('-R', source, destination);
    }

    function npmInstall(destination) {
        var originalCWD = process.cwd();
        cd(destination);

        var npmInstallCode = exec('npm i').code;

        if (npmInstallCode > 0)
            process.exit(npmInstallCode);

        cd(String(originalCWD));
    }

    module.exports = {
        createProject  : function (name) {
            return new GeneratorProject(name);
        },
        currentProject : undefined,
        requireProjects: requireProjects,
        listProjects   : listProjects,
        npmInstall     : npmInstall
    };

}());