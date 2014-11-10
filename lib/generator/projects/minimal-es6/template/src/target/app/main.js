/* global angular:false */

import appRoutes             from 'app/appRoutes';
import AppController         from 'app/AppController';

angular.module('app', [ 'ui.router' ])
  .config(appRoutes)
  .controller('AppController', AppController);

