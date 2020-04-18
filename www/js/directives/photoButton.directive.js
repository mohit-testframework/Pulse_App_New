'use strict';

(function () {
  'use strict';

  /** The photo button directive - Displays the round circular button to take photos/videos, etc...
   ** Data to pass to the directive:
   **/

  pulse.app.directive('photoButton', function () {
    return {
      restrict: 'E',
      templateUrl: 'templates/partials/photo-button.html',
      scope: {
        'partialUrl': '@',
        'animateTime': '@',
        'animateMax': '@',
        'onItemClick': '&',
        'onItemHold': '&',
        'onItemRelease': '&',
        'model': '=',
        'buttonOpacity': '@',
        'processing': '=',
        'fill': '@',
        'changeopacity': '@'
      },
      controller: function controller($timeout, $device, $scope) {
        var vm = this;
        vm.status = $device.status;
        console.log('$scope : ', $scope);
      },
      controllerAs: 'vm',
      bindToController: true,
      link: function link(scope, elem, attrs) {


       elem.bind('click', function() {
        console.log('Test');
          let element = document.getElementById("photo-ring-div");
            console.log('photo-ring-div element : ', element);
            console.log('element.classList : ', element.classList);
            element.style.opacity = "0.5";
           element.style.filter  = 'alpha(opacity=50)';        
        });
      }

    };
  });
})();