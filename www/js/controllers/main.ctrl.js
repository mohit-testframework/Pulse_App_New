'use strict';

(function () {
  'use strict';

  pulse.controllers.controller('MainCtrl', function ($rootScope, $scope, $sce, $ionicPlatform, $ionicLoading, $ionicPopover, $firmware, $q, $location, $ionicHistory, $timeout, $ionicSideMenuDelegate, $ionicNativeTransitions, $menuItems, $timelapse, $video, $device, $photobooth, $photo, $views, $camSettings, $config, $bulb, $platform, btClassic, $cordovaNativeStorage, $cordovaVibration) {
    var vm = this;
    var isAnimatingFooter;
    var spanIndex = -1;
    var sawFirmwareModal = false;

    var hideRightIconStates = ['/app/settings', '/app/about', '/app/timelapsedelay', '/app/exposure', '/app/timelapsemenu', '/app/bugreport', '/app/devices', '/app/appsettings', '/app/updateFirmware', '/app/savePreset', '/app/loadPreset'];

    var backArrowIconStates = ['/app/settings', '/app/about', '/app/bugreport', '/app/timelapsemenu', '/app/exposure', '/app/timelapsedelay', '/app/savePreset', '/app/loadPreset'];

    var dynamicRoutes = ['/app/settings', '/app/timelapsemenu', '/app/exposure', '/app/timelapsedelay', '/app/timelapse'];

    initView();

    vm.isDeviceSelected = function () {
      var device = $device.getSelectedDevice();
      vm.selectedDevice = device;
      if (vm.selectedDevice) {
        return true;
      } else {
        return false;
      }
    };

    vm.navigate = function () {
      var device = $device.getSelectedDevice();
      if (device) {
        $ionicNativeTransitions.locationUrl('/app/timelapse/' + device.id, {
          "type": "slide",
          "direction": "left"
        });
      } else {
        $ionicNativeTransitions.locationUrl('/app/timelapse/ ', {
          "type": "slide",
          "direction": "left"
        });
      }
    };

    vm.getPage = function (name) {
      var menuItems = $menuItems.get();
      var page;

      _.forEach(menuItems, function (menuItem) {
        if (menuItem.name == name) {
          page = menuItem.page;
          return false;
        }
      });
      return page;
    };

    vm.getState = function (name) {
      var state;
      if (name == 'timelapse') {
        var device = $device.getSelectedDevice();
        if (device) {
          state = {
            deviceId: device.id
          };
        }
      }
      return state;
    };

    vm.showBackArrow = function () {
      return showBackArrow();
    };

    function hideRightIcon() {
      var hide = false;
      _.forEach(hideRightIconStates, function (iconState) {
        if ($location.path().indexOf(iconState) > -1) {
          hide = true;
          //break out of loop
          return false;
        }
      });
      return hide;
    }

    function showBackArrow() {
      var show = false;
      _.forEach(backArrowIconStates, function (iconState) {
        if ($location.path().indexOf(iconState) > -1) {
          show = true;
          //break out of loop
          return false;
        }
      });
      return show;
    }

    vm.getLeftIcon = function () {
      var icon;
      _.forEach(backArrowIconStates, function (iconState) {
        if ($location.path().indexOf(iconState) > -1) {
          icon = 'ion-chevron-left';
          //break out of loop
          return false;
        }
      });
      if (!icon && $location.path().indexOf('/app/updateFirmware') < 0) {
        icon = 'ion-navicon';
      }
      return icon;
    };

    vm.updateSelected = function (pulse) {
      _.forEach(vm.connectedPulses, function (connectedPulse) {
        if (connectedPulse.id == pulse.id) {
          connectedPulse.isSelected = true;
        } else {
          connectedPulse.isSelected = false;
        }
      });
      _.forEach(dynamicRoutes, function (route) {
        //if the user is on one of the dynamic pages, we need to reload that page
        if ($location.path().indexOf(route) > -1) {
          //disable the transition to not get weird ui item
          $ionicNativeTransitions.enable(false);
          $location.path(route + '/' + pulse.id);
          $timeout(function () {
            //renenable transitions
            $ionicNativeTransitions.enable(true);
          }, 500);
        }
      });
    };

    vm.getStatusText = function () {
      var selectedDevice = $device.getSelectedDevice();
      if (!vm.connectedPulses || !vm.connectedPulses.length) {
        // return $sce.trustAsHtml('<span class="white">No Pulse Connected</span>');
      } else if (!selectedDevice) {
        return $sce.trustAsHtml('<span class="yellow">No Pulse Selected</span>');
      } else if (selectedDevice.metaData.statusMode == $config.statusMode.CHARGING && selectedDevice.metaData.statusState == $config.statusState.START) {
        return $sce.trustAsHtml('<span class="blue gotham-light">Charging</span>');
      } else if (!selectedDevice.metaData.cameraConnected) {
        return $sce.trustAsHtml('<span class="white">No Camera</span>');
      } else if (selectedDevice.metaData.cameraConnected && typeof selectedDevice.metaData.cameraType == 'undefined') {
        return $sce.trustAsHtml('<span class="white">Connecting Camera</span>');
      } else if ($timelapse.timelapses[selectedDevice.id] && $timelapse.timelapses[selectedDevice.id].settings.isActive) {
        return;
      } else if ($video.settings.isActive) {
        return $sce.trustAsHtml('<span class="blue gotham-light">Recording</span>');
      } else {
        return;
      }
    };

    vm.isTimelapseActive = function () {
      var device = $device.getSelectedDevice();
      if (device && $timelapse.timelapses[device.id] && $timelapse.timelapses[device.id].settings.isActive) {
        vm.completionPercentage = $timelapse.timelapses[device.id].settings.enumeratingTl.completionPercentage;
        return true;
      } else {
        return false;
      }
    };

    vm.getDeviceName = function () {
      var nickname;
      var device = $device.getSelectedDevice();

      if (device && device.localStorageInfo && device.localStorageInfo.nickname) {
        nickname = device.localStorageInfo.nickname;
      }
      return nickname;
    };

    vm.handleLeftNavigation = function () {

      if ($location.path().indexOf('/app/updateFirmware') > -1) {
        //you cant do anything from the firmware update page
        return;
      }
      if (showBackArrow()) {

        //they are seeing the back arrow, so we navigate backwards
        if ($location.path().indexOf('/app/exposure') > -1) {
          var device = $device.getSelectedDevice();
          if (device) {
            //they were in exposure ramping, check for exposure errors
            if ($timelapse.timelapses[device.id].settings.activeExposure) {
              //exposure settings are bad, pop open a model, display the error and don't let the user continue
              var exposureError = $timelapse.checkForExposureErrors(device.id);
              if (exposureError) {
                var modalData = {
                  text: exposureError.message,
                  animation: 'fade-in-scale'
                };
                $rootScope.$broadcast('openModal', modalData);

                return;
              }
            }
          }
        }
        var backURL;
        if ($ionicHistory.backView()) {
          backURL = $ionicHistory.backView().url;
        } else {
          backURL = '/app/main';
        }
        if (backURL == '/app/photobooth' && $photobooth.settings.inProgress) {
          //we are in an active photobooth, render the UI state
          $views.renderPhotoBoothUI();
        }
        //exit out of the settings page
        $ionicNativeTransitions.locationUrl(backURL, {
          "type": "slide",
          "direction": "right",
          "duration": 400
        });
      } else {

        $ionicSideMenuDelegate.toggleLeft();
      }
    };

    vm.showRightIcon = function () {
      var device = $device.getSelectedDevice();
      // Show camera icon only if we're connected and NOT the hide right icon pages
      if (device && device.metaData.cameraConnected && typeof device.metaData.cameraType != 'undefined' && !hideRightIcon()) {
        return true;
      } else {
        return false;
      }
    };

    /**
     * function changePulse
     * @param  {boolean} index - the index of the Pulse array to modify
     * @return {null}
     */
    vm.changePulse = function (index) {
      $device.deselectPulse(index);
    };

    vm.getRightIcon = function () {
      if ($location.path().indexOf('/app/timelapse') > -1) {
        return 'img/dots-white.svg';
      } else {
        return 'img/cam-settings-white.svg';
      }
    };

    vm.getDeviceIcon = function () {
      if ($views.isScanning) {
        return 'ion-load-c ion-spin-animation';
      } else if (!$device.devices.length) {
        return 'fa fa-th-large';
      } else {
        return 'connected';
      }
    };

    vm.getCameraModel = function () {
      var selectedDevice = $device.getSelectedDevice();
      if (!selectedDevice || !selectedDevice.metaData.cameraConnected) {
        return false;
      } else if (selectedDevice && selectedDevice.metaData) {
        return $camSettings.getCameraModel(selectedDevice.metaData);
      } else {
        return false;
      }
    };

    vm.checkbox = function (device) {
      if (device.isMainDevice) {
        return 'checkbox-positive';
      } else {
        return 'checkbox-calm';
      }
    };

    vm.onCheckboxChange = function (device) {
      console.log("The checkbox has changed yo!");
      var oneSelectedDevice = false;
      for (var i = 0; i < vm.sessionDevices.length; i++) {
        if (vm.sessionDevices[i].isSelected) {
          oneSelectedDevice = true;
        }
      }
      if (!oneSelectedDevice) {
        device.isMainDevice = false;
        vm.sessionDevices[0].isSelected = true;
        vm.sessionDevices[0].isMainDevice = true;
      }

      if (device.isMainDevice && !device.isSelected) {
        device.isMainDevice = false;
        for (var i = 0; i < vm.sessionDevices.length; i++) {
          if (vm.sessionDevices[i].isSelected) {
            vm.sessionDevices[i].isMainDevice = true;
          }
        }
      }
    };

    vm.holdMe = function (device) {
      $cordovaVibration.vibrate(25);
      var connectedPulses = $device.getConnectedDevices();
      device.isMainDevice = true;
      for (var i = 0; i < connectedPulses.length; i++) {
        if (connectedPulses[i].id != device.id) {
          connectedPulses[i].isMainDevice = false;
        }
      }
      vm.onCheckboxChange(device);
    };

    /**
       * function handleRightNavigation - handles the process of clicking the right header nav (either going back to the preceding page or showing camera settings)
       * @return null
       */
    vm.handleRightNavigation = function () {
      var header = $('.pulse-header');
      header.removeClass('orange-bg');
      var device = $device.getSelectedDevice();
      $('.pb-header').removeClass('orange-bg');
      $('.menu-pane').removeClass('orange-bg');
      if ($location.path().indexOf('/app/timelapse') > -1) {
        $location.path('/app/timelapsemenu/' + device.id);
      } else if ($location.path().indexOf('/app/settings') == -1) {
        $location.path('/app/settings/' + device.id);
      } else {
        return;
      }
    };

    /**
       * updateArrow - handles whether to show the back arrow or not
       * @param  {Boolean} isTrue - tells us whether to show the arrow
       * @return {null}
       */
    var updateArrow = function updateArrow(isTrue) {
      if (isTrue) {
        vm.showBack = true;
      } else {
        vm.showBack = false;
      }
    };

    vm.openPopover = function ($event) {
      var connectedPulses = $device.getConnectedDevices();
      if (connectedPulses.length > 1) {
        $scope.popover.show($event);
      }
    };

    vm.getStatusMarkup = function () {
      var markup;
      var device = $device.getSelectedDevice();
      if (updatingFirmware) {
        console.log('inside updatingFirmware');
        markup = '<img src="img/circle.svg" class="circle"/><span class="gotham-light footer-text">Performing firmware update</span>';
      } else if (!device || !device.localStorageInfo || !device.localStorageInfo.nickname || !device.isConnected) {
        // console.log('insdie updatingFirmware');
        markup = '<img src="img/circle-white.svg" class="circle"/><span class="gotham-light footer-text">No Pulse Connected</span>';
        isAnimatingFooter = false;
      } else if (device.metaData && device.metaData.statusMode == $config.statusMode.CHARGING && device.metaData.statusState == $config.statusState.START) {
        markup = '<img src="img/circle.svg" class="circle"/><span class="gotham-light footer-text">' + device.localStorageInfo.nickname + ' - Charging</span>';
        isAnimatingFooter = false;
      } else if (!device.metaData || !device.metaData.cameraConnected || device.metaData.cameraModel.length < 1) {
        if (device.metaData.battery < 25) {
          markup = '<img src="img/circle.svg" class="circle"/><span class="gotham-light footer-text">' + device.localStorageInfo.nickname + ' <span class="low-battery">  -  No Camera</span><span class="low-battery"> - Low Battery</span></span>';
          if (!isAnimatingFooter) {
            showBatteryAnimation();
          }
        } else {
          markup = '<img src="img/circle.svg" class="circle"/><span class="gotham-light footer-text">' + device.localStorageInfo.nickname + ' - No Camera</span>';
          isAnimatingFooter = false;
        }
      } else if (device.metaData.cameraConnected && device.metaData.cameraModel.length < 1) {
        markup = '<img src="img/circle.svg" class="circle"/><span class="gotham-light footer-text">' + device.localStorageInfo.nickname + ' - Connecting Camera</span>';
      } else {

        var model = $camSettings.getCameraModel(device.metaData);
        markup = '<img src="img/connected.svg" class="circle"/><span class="gotham-light footer-text">' + device.localStorageInfo.nickname + ' - ' + model + '</span>';
        isAnimatingFooter = false;
      }

      return markup;
    };

    function showBatteryAnimation() {
      var spans = $(".low-battery");
      if (spans.length > 0) {
        isAnimatingFooter = true;
        ++spanIndex;
        spans.eq(spanIndex % spans.length).fadeIn(1000).delay(6000).fadeOut(1000, showBatteryAnimation);
      }
    }

    vm.arePulsesConnected = function () {
      vm.connectedPulses = $device.getConnectedDevices();
      if (vm.connectedPulses.length) {
        return true;
      } else {
        return false;
      }
    };

    //Handle header UI elements when navigating
    $rootScope.$on('$stateChangeSuccess', function (event, toState, toParams, fromState, fromParams) {
      console.log('### NAVIGATED TO THE ' + toState.name + ' PAGE FROM ' + fromState.name + ' PAGE ###');
      if (toState.name == 'app.devices') {
        updateArrow(true);
      } else {
        updateArrow();
      }
    });

    function firmwareOrAppUpdateModal(configObj, data) {

      if ($views.checkForAppUpdate(configObj)) {
        var modalData = {
          text: 'Your app is out of date. Would you like to update it now?',
          onButtonClick: function onButtonClick() {},
          onYesButtonClick: function onYesButtonClick() {
            if ($platform.isAndroid()) {
              cordova.InAppBrowser.open('https://play.google.com/store/apps/details?id=com.alpinelabs.pulse&hl=en');
            } else {
              cordova.InAppBrowser.open('https://itunes.apple.com/us/app/pulse-camera-control/id1093969356?mt=8');
            }
          },
          animation: 'fade-in-scale',
          twoButton: true
        };
        $rootScope.$broadcast('openModal', modalData);
      } else {
        if (!$views.canDoAndroidFota() || data.appCheckOnly) {
          return;
        }
        var device = $device.getSelectedDevice();
        var currentFirmware = parseFloat(device.firmwareVersion);
        if (configObj.minimumVersion) {
          if (configObj.minimumVersion.minor < 10) {
            configObj.minimumVersion.minor = '0' + configObj.minimumVersion.minor;
          }

          var minimumFirmware = parseFloat('' + configObj.minimumVersion.major + '.' + configObj.minimumVersion.minor);
          $timeout(function () {
            $cordovaNativeStorage.getItem('firstLogin').then(function (sessions) {
              if (minimumFirmware > currentFirmware && sessions > 2) {
                var modalData = {
                  text: 'Your firmware ' + currentFirmware + ' is out of date. Update now?',
                  onButtonClick: function onButtonClick() {},
                  onYesButtonClick: function onYesButtonClick() {},
                  animation: 'fade-in-scale',
                  twoButton: true,
                  firmware: true
                };
                $rootScope.$broadcast('openModal', modalData);
              }
            });
          }, 10000);
        }
      }
    }

    function performFirmwareCheck(data) {
      $firmware.getMostRecentFirmwareVersion().then(function (firmware) {
        if (firmware.abortModes) {
          $views.abortModes = true;
        }
        if (firmware.bulbThumbs) {
          $bulb.settings.thumbsEnabled = true;
        }
        if (firmware.minor < 10) {
          firmware.minor = '0' + firmware.minor;
        }

        firmwareOrAppUpdateModal(firmware, data);
      });
    }

    function initView() {
      vm.leftIcon = $device.status;
      vm.showBack = false;
      vm.$location = $location;
      vm.devices = $device.devices;
      vm.timelapse = $timelapse;
      vm.control = {};

      vm.menuItems = $menuItems.get();
      vm.sessionDevices = $device.sessionDevices;
      vm.selectedDevice = $device.getSelectedDevice();
      vm.canDrag = $views.canDragSideMenu;
      vm.photobooth = $photobooth.settings;

      $ionicPopover.fromTemplateUrl('templates/partials/device-popover.html', { scope: $scope }).then(function (popover) {
        $scope.popover = popover;
      });

      //PAUSE & RESUME EVENTS
      $ionicPlatform.on('pause', function (event) {
        var device = $device.getSelectedDevice();
        console.log("going to background mode");
        if (device) {
          device.btClassic.enabled = false;
          //only close session for android SAH not clear why this is here really.
          if ($platform.isAndroid()) {
            device.btClassic.connected = false;
            btClassic.closeSession();
          }
          $device.setDevice(device);
        }
      });

      $ionicPlatform.on('resume', function (event) {
        var device = $device.getSelectedDevice();
        console.log("returning from background mode");
        var os = $platform.getDeviceVersion();
        if (device && device.btClassic.enabled && os != "11.2.5") {
          btClassic.connect(device.metaData.macAddress, device).then(function (result) {
            device.btClassic.enabled = true;
            device.btClassic.connected = true;
            $device.setDevice(device);
          }, function (error) {
            console.log(error);
            device.btClassic.enabled = false;
            device.btClassic.connected = false;
          });
        }
      });
    }
    $rootScope.$on('receivedThumbnailMeta', function (event) {
      $photo.killForceThumb();
    });

    $rootScope.$on('btConnect', function (event, data) {
      if (data.success) {
        var device = $device.getSelectedDevice();
        device.btClassic.connected = true;
        device.btClassic.enabled = true;
        $device.setDevice(device);
      } else {
        var os = $platform.getDeviceVersion();
        if (os === "11.2.5") {
          console.log("Using OS 11.2.5, fuuuuuck");
          var modalData = {
            text: 'Unfortunately it looks like you have iOS 11.2.5 which has a critical bug that does not allow for Thumbnails with Pulse. This problem only seems to happen with this iOS version and there is unfortuantely nothing we can do to get around the issue. ',
            onButtonClick: function onButtonClick() {},
            onYesButtonClick: function onYesButtonClick() {},
            animation: 'fade-in-scale',
            twoButton: false
          };
          $rootScope.$broadcast('openModal', modalData);

          return;
        }

        btClassic.connect(data.address, data.device, false, false, true).then(function (result) {
          var device = $device.getSelectedDevice();
          device.btClassic.connected = true;
          device.btClassic.enabled = true;
          $device.setDevice(device);
        });
      }
    });

    var fwStuff = $rootScope.$on('firmwareModalTime', function (event, data) {
      console.log('checking firmware to see if we need to show update modal');
      $ionicPlatform.ready(function () {
        performFirmwareCheck(data);
        fwStuff();
      });
    });

    $rootScope.$on('openModal', function (event, data) {
      vm.control.text = data.text;
      vm.control.twoButton = data.twoButton;
      vm.control.firmware = data.firmware;
      vm.control.hasCheckbox = data.hasCheckbox;
      vm.control.classicModal = data.classicModal;
      vm.control.checkboxAction = data.checkboxAction;
      vm.control.checkboxText = data.checkboxText;
      vm.control.assignedClass = data.assignedClass || 'pulseModal';
      vm.control.onButtonClick = data.onButtonClick || function () {};
      vm.control.onYesButtonClick = data.onYesButtonClick || function () {};
      vm.control.openModal(data.animation);
    });
    $rootScope.$on('openModal-long', function (event, data) {
      vm.control.text = data.text;
      vm.control.twoButton = data.twoButton;
      vm.control.firmware = data.firmware;
      vm.control.hasCheckbox = data.hasCheckbox;
      vm.control.classicModal = data.classicModal;
      vm.control.checkboxAction = data.checkboxAction;
      vm.control.checkboxText = data.checkboxText;
      vm.control.assignedClass = data.assignedClass || 'pulseModal';
      vm.control.onButtonClick = data.onButtonClick || function () {};
      vm.control.onYesButtonClick = data.onYesButtonClick || function () {};
      vm.control.openModalLong(data.animation);
    });
  });
})();