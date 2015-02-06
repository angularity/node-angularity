# angularity

  Angularity is an opinionated build tool for AngularJS projects.
  
  Tasks include:
  build, css, html, init, javascript, release, server, test, watch, webstorm

Examples:
  angularity                   Interactive menu
  angularity -v                Display the version of angularity
  angularity -h <task name>    Get help on a particular task
  angularity <task name>       Run the given task


Options:
  -h, -?, --help  This help message, or help on a specific task                 
  --version, -v   Display the version of angularity                             


## angularity build

  The "build" task performs a single build of the javascript and SASS
  composition root(s).

Examples:
  angularity build       Run this task
  angularity build -u    Run this task but do not minify javascript


Options:
  --help, -h, -?    This help message                                           
  --unminified, -u  Inhibit minification of javascript          [default: false]


## angularity css

  The "css" task performs a one time build of the SASS composition root(s).

Examples:
  angularity css    Run this task


Options:
  --help, -h, -?  This help message                                             


## angularity html

  The "html" task performs a one time injection of pre-built JS and CSS into
  the application HTML.

Examples:
  angularity html    Run this task


Options:
  --help, -h, -?  This help message                                             


## angularity init

  The "init" task initialises a blank project and optionally an IDE
  environment. The given options initialise project defaults. Where omitted the
  global default will be in effect for the project.
  
  The following steps are taken. Some steps are gated by respective a flag.
  Default options may be globally defined or reset using the --defaults
  option.
  
  * project directory     exists, else create    --subdir
  * /app                  exists, else create
  * /app/*.html           exists, else create
  * /app/*.scss           exists, else create
  * angularity.json       exists, else create
  * package.json          exists, else create    --npm
  * bower.json            exists, else create    --bower
  * karma.conf.js         exists, else create    --karma
  * .jshintrc             exists, else create    --jshint
  * .gitignore            exists, else create    --gitignore
  * initialise and launch an IDE                 --ide
  
  Notes:
  
  * No properties are set in existing files, delete existing files in order to
  change properties.
  * Both the npm and bower packages are initially set private which you will
  need to clear in order to publish.
  * Any given IDE is initialised per its task defaults. Use the task separately
  to review these options.

Examples:
  angularity init -n todo -i webstorm      Create "todo" and initialise webstorm
  angularity init --defaults -n pending    Change the name default to "pending
  angularity init --defaults reset         Reset defaults


Options:
  --help, -h, -?     This help message                                          
  --defaults, -z     Set defaults                                               
  --subdir, -s       Create a sub-directory per name                            
  --name, -n         The project name                    [default: "my-project"]
  --version, -v      The project version                      [default: "0.0.0"]
  --description, -d  The project description                       [default: ""]
  --tag, -t          A project tag                                   [default: ]
  --port, -p         A port for the development web server   [default: "random"]
  --npm              Create package.json                         [default: true]
  --bower            Create bower.json                           [default: true]
  --karma            Create karma.conf.js                        [default: true]
  --jshint           Create .jshintrc                            [default: true]
  --gitignore        Create .gitignore                           [default: true]
  --ide              Initialise IDE webstorm                   [default: "none"]


## angularity javascript

  The "javascript" task performs a one time build of the javascript composition
  root(s).

Examples:
  angularity javascript       Run this task
  angularity javascript -u    Run this task but do not minify javascript


Options:
  -h, -?, --help    This help message                                           
  -u, --unminified  Inhibit minification of javascript          [default: false]


## angularity release

  The "release" task performs a single build and exports the build files along
  with bower components to a release directory.

Examples:
  angularity release       Run this task
  angularity release -n    Run this task but do not minify built javascript


Options:
  --help, -h, -?    This help message                                           
  --unminified, -u  Inhibit minification of javascript          [default: false]


## angularity server

  The "server" task performs a one time build and then serves the application
  on localhost at the given port.

Examples:
  angularity server            Run this task and serve on the default port
  angularity server -p 8080    Run this task and serve at http://localhost:8080
  angularity server -n         Run this task but do not minify built javascript


Options:
  --help, -h, -?    This help message                                           
  --unminified, -u  Inhibit minification of javascript          [default: false]
  --port, -p        A port for the development web server       [default: 55555]


## angularity test

  The "test" task performs a one time build and karma test of all .spec.js
  files in the project.

Examples:
  angularity test    Run this task


Options:
  --help, -h, -?  This help message                                             


## angularity watch

  The "watch" task performs an initial build and then serves the application on
  localhost at the given port. It then watches the project and performs rebuild
  of Javascript and/or SASS compositions upon change. This is followed by HTML
  injection and browser reload.

Examples:
  angularity watch            Run this task
  angularity watch -p 8080    Run this task and serve at http://localhost:8080
  angularity watch -n         Run this task but do not minify javascript


Options:
  --help, -h, -?    This help message                                           
  --unminified, -u  Inhibit minification of javascript          [default: false]
  --port, -p        A port for the development web server       [default: 55555]


## angularity webstorm

  The "webstorm" task initialises webstorm for a project in the current working
  directory and launches the IDE.
  
  Where the IDE is installed in a non-standard location the full path to the
  IDE should be used in place of the boolean in --launch.
  
  The following steps are taken. Some steps are gated by respective a flag.
  Default options may be globally defined or reset using the --defaults
  option.
  
  * Setup project (resources, debug config, suppressors)   --project
  * Create external tools that launch angularity           --tools
  * Set coding style rules                                 --rules
  * Add code templates                                     --templates
  * Launch IDE                                             --launch

Examples:
  angularity webstorm                              Run this task
  angularity webstorm --defaults -l <some-path>    Set a default executable path
  angularity webstorm --defaults reset             Reset defaults


Options:
  --help, -h, -?   This help message                                            
  --defaults, -z   Set defaults                                                 
  --subdir, -s     Navigate to the sub-directory specified                      
  --project, -p    Setup project                                 [default: true]
  --tools, -t      Install external tools                        [default: true]
  --rules, -r      Set style rules                               [default: true]
  --templates, -t  Add code templates                            [default: true]
  --launch, -l     Launch the IDE following setup                [default: true]


