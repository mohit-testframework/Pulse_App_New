'use strict';

(function () {
  'use strict';

  pulse.controllers.controller('SettingsCtrl', function (BLE, $timeout, $device, $camSettings, $ionicSideMenuDelegate, $views, $scope, $timelapse, $rootScope, $stateParams) {
    var vm = this;

    init();

    $rootScope.$on('shutterUpdated', function(event, data) {
      $timeout(function () {
        vm.indexes.shutterIndex = data.shutterIndex;
        $scope.$apply();
      }, 500);
    });

    $rootScope.$on('shutterArray', function (event, data) {
      vm.selectedDevice = $device.getSelectedDevice();
      $scope.$apply();
    });

    $rootScope.$on('apertureUpdated', function (event, data) {
      $timeout(function () {

        vm.indexes.apertureIndex = data.apertureIndex;
        $scope.$apply();
      }, 500);
    });

    $rootScope.$on('isoUpdated', function (event, data) {
      $timeout(function () {

        vm.indexes.isoIndex = data.isoIndex;
        $scope.$apply();
      }, 500);
    });

    /**
     * disconnectDevice - calls BLE service to disconnect a connected device
     * @return {null}
     */
    vm.disconnectDevice = function () {
      if (!$device.status.isConnected) {
        return;
      }
      $device.getDevices().then(function (device) {
        $device.disconnectPulse(device).then(function (result) {
          if (result.success) {
            //disconnect succeeded
            vm.bleStatus = false;
            vm.mainText = 'Pulse has been disconnected. Swipe down to reconnect';

            vm.connectingStatus = {
              'text': '',
              'class1': '',
              'class2': '',
              'connected': false
            };
          }
        });
      });
    };

    vm.isTimelapseActive = function () {
      var selectedDevice = $device.getSelectedDevice();
      var isActiveTl = false;
      if (selectedDevice && $timelapse.timelapses && $timelapse.timelapses[selectedDevice.id]) {
        isActiveTl = $timelapse.timelapses[selectedDevice.id].settings.isActive;
      }
      return isActiveTl;
    };

    vm.updateTlSettings = function () {
      if (vm.disabledUpdateButton) {
        //nothing has changed don't bother doing anything
        return;
      }
      vm.btnText = 'Settings Updated';
      var shutterContainer = $('.slider-container.shutter');
      var apertureContainer = $('.slider-container.aperture');
      var isoContainer = $('.slider-container.iso');
      var selectedDevice = $device.getSelectedDevice();
      vm.disabledUpdateButton = true;

      //get shutter index
      if (shutterContainer.length) {
        var currentShutterEl = shutterContainer.find('.swiper-slide-active'),
            currentShutterIndex = currentShutterEl.data('index'),
            currentShutterSlide = parseInt(currentShutterIndex, 10);
        $camSettings.updateSetting(selectedDevice, 'shutter', currentShutterSlide);
      }

      //get aperture index
      if (apertureContainer.length) {
        var currentApertureEl = apertureContainer.find('.swiper-slide-active'),
            currentApertureIndex = currentApertureEl.data('index'),
            currentApertureSlide = parseInt(currentApertureIndex, 10);
        $camSettings.updateSetting(selectedDevice, 'aperture', currentApertureSlide);
      }

      //get iso index
      if (isoContainer.length) {
        var currentIsoEl = isoContainer.find('.swiper-slide-active'),
            currentIsoIndex = currentIsoEl.data('index'),
            currentIsoSlide = parseInt(currentIsoIndex, 10);
        $camSettings.updateSetting(selectedDevice, 'iso', currentIsoSlide);
      }
    };

    vm.onReadySwiper = function (swiper, parentClass, settingType) {
      var parent = $('.' + parentClass);
      var header = parent.find('.setting-header');
      var slide = parent.find('.swiper-slide.clear');

      swiper.on('onTransitionEnd', function () {
        console.log('onTransitionEnd : ')
        var selectedDevice = $device.getSelectedDevice();
        var isActiveTl;
        if ($timelapse.timelapses && $timelapse.timelapses[selectedDevice.id]) {
          isActiveTl = $timelapse.timelapses[selectedDevice.id].settings.isActive;
        }
        if (!isActiveTl) {
          //the plugin does a really bad job of returning the correct index. Use jquery to fetch it from the data attribute
          var currentSlideElement = parent.find('.swiper-slide-active'),
              currentSlideIndexString = currentSlideElement.data('index'),
              currentSlide = parseInt(currentSlideIndexString, 10);
          $camSettings.updateSetting(selectedDevice, settingType, currentSlide);
        } else {
          vm.btnText = 'Update Settings';
          vm.disabledUpdateButton = false;
        }
      });
    };

    function init() {
      vm.indexes = {
        'shutterIndex': 0,
        'apertureIndex': 0,
        'isoIndex': 0
      };
      vm.devices = $device.sessionDevices;
      vm.selectedDevice = $device.getSelectedDevice();
      vm.viewMode = $views.viewMode;
      vm.bleStatus = _.clone($device.status.isConnected);
      vm.connectingStatus = {};
      vm.connectingStatus.connected = false;
      vm.disabledUpdateButton = true;
      vm.btnText = 'Update Settings';
      vm.mainText = 'Pulse is not connected. Make sure bluetooth is enabled; then swipe down to scan for your pulse.';

      $ionicSideMenuDelegate.canDragContent(false);
    }
  });
})();