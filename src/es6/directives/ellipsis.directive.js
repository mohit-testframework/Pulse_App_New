
(function() {
  'use strict';
  pulse.app.directive('ellipsisAnimated', function($firmware) {
    return {

      restrict: "EAC",

      template: "<span class='ellipsis_animated-inner'>" +
        "<span>.</span>" +
        "<span>.</span>" +
        "<span>.</span>" +
        "</span>",

    };

  });

})();
