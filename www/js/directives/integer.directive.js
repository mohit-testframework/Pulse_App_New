'use strict';

pulse.app.directive('integer', function () {
  return {
    require: 'ngModel',
    link: function link(scope, ele, attr, ctrl) {
      ctrl.$parsers.unshift(function (viewValue) {
        return parseInt(viewValue, 10);
      });
    }
  };
});