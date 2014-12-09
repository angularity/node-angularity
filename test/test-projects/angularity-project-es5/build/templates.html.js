(function(module) {
try {
  module = angular.module('templates');
} catch (e) {
  module = angular.module('templates', []);
}
module.run(['$templateCache', function($templateCache) {
  $templateCache.put('partials/partial.html',
    '<section><h5>{{::title}}</h5></section>');
}]);
})();
