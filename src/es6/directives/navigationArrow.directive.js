(function() {
  'use strict';

  /** The navigation arrow directive - Displays the navigation chevron, and handles what to do on swipe or click
   ** Data to pass to the directive:
   ** 1. direction: {string} The direction of the swipe transition
   ** 2. type: {string} The type of arrow to display (up,down,left,right)
   ** 3. location: {string} The state/url to navigate to
   ** 4. viewMode: {string} The string to set the page title to.
   **/

  pulse.app.directive('navigationArrow', function() {
    return {
      restrict: 'E',
      templateUrl: 'templates/partials/navigation-arrow.html',
      scope: {
        'direction': '@',
        'type': '@',
        'location' : '@',
        'viewMode': '@'
      },
      controller: function($ionicNativeTransitions, $ionicHistory, $views) {
        var vm = this;

        /**
         * function handleArrowNav - handles what to do when swiping on the arrow Navigation
         * @param  {object} $event The event that's triggered this function
         * @return {null}
         */
        vm.handleArrowNav = function($event) {
          //since this is a modular function, it can handle multiple swipe interactions. We need to make sure that the swipe was the swipe we are expecting
          if ($event.type.indexOf('swipe') > -1){
            if ($event.type.indexOf(vm.direction) < 0){
              //swipe is not the type of swipe we wanted. jump out
              return;
            }
          }
          var navUrl;
          var pixelsTop = 0;
          if (vm.location){
            navUrl = '/app/' + vm.location;
          }
          else{
            navUrl = $ionicHistory.backView().url;
          }

          pixelsTop = 75;

          $ionicNativeTransitions.locationUrl(navUrl, {
            "type": vm.type,
            "direction": vm.direction,
            "duration": 200,
            "fixedPixelsTop": pixelsTop
          });
          $views.viewMode = vm.viewMode;

        };
      },
      controllerAs: 'vm',
      bindToController: true,
      link: function() {}

    };

  });

})();
