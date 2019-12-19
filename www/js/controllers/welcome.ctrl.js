'use strict';

(function () {
  'use strict';

  pulse.controllers.controller('WelcomeCtrl', function ($scope, $ionicSlideBoxDelegate, $location, $ionicSideMenuDelegate, $ionicHistory, $device, $timeout, $cordovaNativeStorage) {
    var vm = this;

    var hasFocused = false;
    vm.nickname = 'My Pulse';
    vm.saveText = 'Save Nickname';
    var shouldSave = true;

    // Disable drag-to-open menu
    $scope.$on('$ionicView.enter', function () {
      $ionicHistory.clearHistory();
      $ionicSideMenuDelegate.canDragContent(false);
    });

    vm.nextSlide = function () {
      $ionicSlideBoxDelegate.next();
    };

    vm.exitWelcomeScreen = function () {
      //they have exited the welcome screen. Start Scanning
      $device.scanAndConnectDevices();
      $location.path('/app/main');
    };

    vm.checkForEnter = function (key) {
      if (key == 13) {
        //they've pressed the enter key on the keyboard - hide it
        cordova.plugins.Keyboard.close();
      }
    };

    vm.saveNickname = function () {
      var buttonPressed = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;

      $cordovaNativeStorage.setItem('welcomeNickname', vm.nickname);
      vm.saveText = 'Nickname Saved!';
      shouldSave = false;
      if (buttonPressed) {
        $timeout(function () {
          $ionicSlideBoxDelegate.slide(2);
        }, 300);
      }
    };

    vm.onFocus = function () {
      vm.saveText = 'Save Nickname';
      shouldSave = true;
    };

    vm.slideHasChanged = function (slideIndex) {
      if (shouldSave && slideIndex == 2) {
        vm.saveNickname();
      }
    };
  });
})();