/* global angular:false */

import appRoutes             from 'app/appRoutes';
import AppController         from 'app/AppController';

angular.module('app', ['templates', 'ui.router'])
  .config(appRoutes)
  .controller('AppController', AppController);

