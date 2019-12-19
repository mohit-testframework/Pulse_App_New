'use strict';

pulse.app.directive('focusMe', function ($timeout) {
  return {
    link: function link(scope, element, attrs) {
      $timeout(function () {
        element[0].focus();
      }, 150);
    }
  };
});