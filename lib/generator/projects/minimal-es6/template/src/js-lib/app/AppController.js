var uuid = require('node-uuid');

/**
 * <p>Hello World Controller</p>
 */
export default class AppController {

  /**
   * @constructor
   * @ngInject
   */
  constructor($scope) {

    this.title = 'Hello World controller';

    $(document.body).append('<h1>' + uuid.v4() + '</h1>');
  }

}