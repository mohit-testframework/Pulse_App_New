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
        'fill': '@'
      },
      controller: function controller($timeout, $device, $scope) {
        var vm = this;
        vm.status = $device.status;
      },
      controllerAs: 'vm',
      bindToController: true,
      link: function link() {}

    };
  });
})();