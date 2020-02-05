pulse.app.directive('tlSref', function($compile) {
  return {
    restrict: 'A',
    link: function(scope, element, attrs) {
      scope.$watch(function(){return element.attr('tl-sref');}, function(newV, oldV) {
        if (newV !== oldV) {
          attrs.$set('uiSref', newV);
          element.replaceWith($compile(element)(scope));
        }
      });
    }
  };
});
