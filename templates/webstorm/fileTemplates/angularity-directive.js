/**
 * TODO description of this Directive
 * @ngInject
 */
function $declaration(/* TODO injectables.. */) {
  return {
    scope      : {
      /* TODO define isolated scope */
      foo: '@foo',  /* initialise from attribute    */
      bar: '&bar',  /* 1 way binding with attribute */
      baz: '=baz'   /* 2 way binding with attribute */
    },
    restrict   : 'ACE',
    replace    : true,
    transclude : false,
    template   : require('./${NAME}.html'),
    templateUrl: undefined,
    require    : undefined,
    link       : link,
    controller : controller /* TODO set undefined if API is not required */
  };
}

/**
 * The link function for the directive
 * @param {object} ${DS}element the DOM element
 * @param {object} ${DS}attributes attributes from the element
 * @param {object} ${DS}scope the directive scope
 */
function link(${DS}element, ${DS}attributes, ${DS}scope /*, TODO required controllers.. */) {
  /* TODO implement directive here, controller is only for API (where needed) */
}

/**
 * The external API of the directive
 * @ngInject
 */
function controller(/* TODO injectables.. */) {
  /* TODO implement API only, delete if unused */
}

module.exports = $declaration;
