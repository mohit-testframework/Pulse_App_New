'use strict';

(function () {
  'use strict';

  pulse.controllers.controller('BulbCtrl', function ($device, $timelapse, $bulb, $scope, $timeout, $ionicSideMenuDelegate, $camSettings, $views, $cordovaVibration, btClassic, $rootScope, $photo, $histogram, $cordovaNativeStorage, $ionicPlatform) {
    var vm = this;
    initView();
    var waitingForResponse = false;
    var requestingThumb = false;
    var isRendering = false;
    var hasReceivedThumb = false;

    $rootScope.$on('bulbReconnect', function (event, data) {

      //app was closed and reopened and we have an active video. We need to re-render the ui
      console.log('reconnecting bulb');
      if (data.settings.isActive) {
        $bulb.settings.isActive = true;

        vm.timerStart = data.ellapsedMs;
        if (data.settings.isTimed) {
          $bulb.settings.isTimed = true;
          var maxMinutes = Math.floor(data.duration.animationValues.max / 60);
          var maxSeconds = data.duration.animationValues.max - maxMinutes * 60;
          if (maxMinutes.toString().length == 1) {
            maxMinutes = '0' + maxMinutes;
          }
          if (maxSeconds.toString().length == 1) {
            maxSeconds = '0' + maxSeconds;
          }
          vm.maxMinutes = maxMinutes;
          vm.maxSeconds = maxSeconds;
        } else {
          $bulb.settings.isTimed = false;
        }

        if ($bulb.settings.isActive && $bulb.settings.isTimed) {
          $bulb.startInterval((Date.now() - vm.timerStart) / 1000, vm.maxMinutes * 60 + vm.maxSeconds);
        }

        $scope.$apply();
        $scope.$broadcast('timer-start');
      }
    });

    $rootScope.$on('bulbDone', function (event) {
      var device = $device.getSelectedDevice();

      if (device.btClassic.connected && device.btClassic.enabled && $bulb.settings.thumbsEnabled) {
        vm.camSettings = $photo.getPhotoSettings();
        vm.showPreview = true;
        vm.showSpinner = true;
        vm.backgroundGradient = 0.6;
        $timeout(function () {
          requestingThumb = true;
          $photo.getThumb(device);
        }, 5000);
      } else {
        vm.finishBulb();
      }
    });

    $rootScope.$on('thumbnailUpload', function (event, data) {
      isRendering = false;
      if (requestingThumb) {
        if (data.hasThumb) {
          vm.showSpinner = false;
          vm.backgroundGradient = 0.0;
          vm.thumb = data.thumbPath;
          vm.defaultThumb = false;
          hasReceivedThumb = true;
          requestingThumb = false;
          histogram(data.thumbPath, function (err, histData) {
            if (histData) {
              vm.histogramItems = $histogram.prepareHistogram(histData);
              //make sure the histogram redraws
              $scope.$apply();
            }
          });
        } else {
          //thumbnail failed
          vm.showSpinner = false;
          vm.backgroundGradient = 0.0;
        }
      }
    });

    vm.isBtClassicConnected = function () {
      var device = $device.getSelectedDevice();
      vm.selectedDevice = device;
      if (device && device.btClassic.enabled && device.btClassic.connected) {
        return true;
      } else {
        return false;
      }
    };

    function initView() {
      vm.model = $bulb;
      $scope.duration = $bulb.duration;
      var device = $device.getSelectedDevice();
      vm.device = device;
      if (device && !$views.doesModelSupport(device, 'bulb')) {
        vm.modelNotSupported = true;
      }
      vm.errorClass = 'hidden';
      setBulbBackgroundMode();
    }

    vm.toggleHistogram = function () {
      if (!vm.histogramItems || !vm.histogramItems.data) {
        vm.histogram = false;
      } else if (vm.histogram) {
        vm.histogram = false;
      } else {
        vm.histogram = true;
      }
    };

    vm.setTimedMode = function () {
      $bulb.settings.isTimed = true;
    };

    vm.setManualMode = function () {
      $bulb.settings.isTimed = false;
    };

    vm.startOrStopBulb = function () {
      var device = $device.getSelectedDevice();
      var bulbIndex = $device.findShutterIndex(device, 'BULB', device.metaData.camSettings.shutterOptions);
      var cameraMode = device.metaData.cameraMode;
      var canProceed = bulbIndex || cameraMode == 'BULB' || $views.permissableMode || $views.abortModes;
      vm.timerStart = Date.now();

      if (device && !$views.doesModelSupport(device, 'bulb')) {
        //camera model isnt supported, return and show overlow
        vm.modelNotSupported = true;
        return;
      }
      if (device && device.metaData.cameraConnected && canProceed) {
        if ($bulb.settings.isActive) {
          $cordovaVibration.vibrate(25);
          var mins, secs;
          if ($bulb.settings.isTimed) {
            mins = Math.floor($bulb.duration.animationValues.current / 60);
            secs = $bulb.duration.animationValues.current - mins * 60;
          } else {
            mins = Math.floor($bulb.duration.manual.minutes / 60);
            secs = $bulb.duration.manual.seconds - mins * 60;
          }

          if (mins.toString().length == 1) {
            mins = '0' + mins;
          }
          if (secs.toString().length == 1) {
            secs = '0' + secs;
          }
          vm.stoppedMinutes = mins;
          vm.stoppedSeconds = secs;
          $bulb.stopBulb();
          $cordovaNativeStorage.remove('bulb');
          $scope.$broadcast('timer-stop');
        } else {
          $cordovaVibration.vibrate(25);
          $bulb.startBulb();
          var maxMinutes = Math.floor($bulb.duration.animationValues.max / 60);
          var maxSeconds = $bulb.duration.animationValues.max - maxMinutes * 60;
          if (maxMinutes.toString().length == 1) {
            maxMinutes = '0' + maxMinutes;
          }
          if (maxSeconds.toString().length == 1) {
            maxSeconds = '0' + maxSeconds;
          }
          vm.maxMinutes = maxMinutes;
          vm.maxSeconds = maxSeconds;
          $scope.$broadcast('timer-start');
          $cordovaNativeStorage.setItem('bulb', {
            startTime: Date.now(),
            settings: $bulb.settings,
            duration: $bulb.duration
          });
        }
      }
      if (!canProceed) {
        vm.errorClass = 'animated fadeIn';
        $timeout(function () {
          vm.errorClass = 'animated fadeOut';
          $timeout(function () {
            vm.errorClass = 'hidden';
          }, 1000);
        }, 5000);
      }
    };

    vm.getMode = function () {
      if ($bulb.settings.isTimed) {
        return 'Timed Exposure';
      } else {
        return 'Manual Exposure';
      }
    };

    // Enable drag-to-open menu
    $scope.$on('$ionicView.enter', function () {
      $ionicSideMenuDelegate.canDragContent(false);
    });

    vm.showThumbToggle = function () {
      var device = $device.getSelectedDevice();
      vm.selectedDevice = device;
      if (device) {
        return true;
      } else {
        return false;
      }
    };

    vm.handleToggle = function (enabled) {
      var os = $platform.getDeviceVersion();
      if (os === "11.2.5") {
        console.log("Using OS 11.2.5, fuuuuuck");
        var modalData = {
          text: "Unfortunately Apple’s iOS 11.2.5 release had significant bluetooth bugs and has disabled the Image Review feature. This feature will be disabled until Apple releases fixes to iOS. All other Pulse features are functioning correctly. Thank you for your patience! ",

          onButtonClick: function onButtonClick() {},
          onYesButtonClick: function onYesButtonClick() {},
          animation: 'fade-in-scale',
          twoButton: false
        };
        $rootScope.$broadcast('openModal-long', modalData);

        return;
      }
      if (enabled) {
        var device = $device.getSelectedDevice();
        //try to turn the toggle on
        btClassic.isConnected(device.metaData.macAddress).then(function (result) {
          //we are already connected, update the device already
          device.btClassic.connected = true;
          device.btClassic.enabled = true;
          vm.selectedDevice = device;
        }, function (error) {

          //we aren't connected. Try to connect
          btClassic.connect(device.metaData.macAddress, device, false, true).then(function (result) {

            device.btClassic.connected = true;
            device.btClassic.enabled = true;
            vm.selectedDevice = device;
          }, function (error) {

            device.btClassic.enabled = false;
            device.btClassic.connected = false;
            vm.selectedDevice = device;
          });
        });
      }
    };

    vm.finishBulb = function () {
      vm.maxMinutes = false;
      vm.maxSeconds = false;
      vm.stoppedSeconds = false;
      vm.stoppedMinutes = false;
      vm.showPreview = false;
    };

    function setBulbBackgroundMode() {
      $ionicPlatform.on('pause', function (event) {
        console.log('saving bulb mode in background mode');
        if ($bulb.settings.isActive && $bulb.settings.isTimed) {
          $bulb.settings.backgroundTime = Date.now();
          $bulb.settings.backgroundMode = true;
          $bulb.cancelInterval();
        }
      });

      $ionicPlatform.on('resume', function (event) {
        console.log('refreshing bulb mode in background');
        if ($bulb.settings.isActive && $bulb.settings.isTimed) {
          var currentTime = Date.now();
          var ellapsedTime = Math.round((currentTime - $bulb.settings.backgroundTime) / 1000);
          $bulb.startInterval(ellapsedTime);
        }
      });
    }
  });
})();