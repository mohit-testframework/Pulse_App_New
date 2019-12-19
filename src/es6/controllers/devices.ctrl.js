(function() {
  'use strict';
  pulse.controllers.controller('DevicesCtrl', function($device, $views, $scope, $camSettings, $config, $ionicSideMenuDelegate, $rootScope, $transmit, $cordovaNativeStorage, $timeout, $interval) {

    // Enable drag-to-open menu
    $scope.$on('$ionicView.enter', function() {
      $ionicSideMenuDelegate.canDragContent(true);
    });
    var localStorageDevices;
    var vm = this;
    vm.sessionDevices = $device.sessionDevices;
    vm.selectedRow = -1;
    vm.editingRow = -1;
    var isScanning = false;
    $device.getDevicesFromStorage().then((result) => {
      localStorageDevices = sortByConnectedDevices(result);
      vm.localStorageDevices = _.filter(localStorageDevices);
    });

    var blinkingPulses = [];

    if (window.cordova) {
      cordova.plugins.Keyboard.disableScroll(true);
    }


    vm.noBLE = function() {
      if (window.cordova) {
        return true;
      }
    };

    vm.getCameraModel = function(device) {
      var selectedDevice = _.find($device.devices, (item) => {
        return device.id == item.id;
      });
      if (!selectedDevice) {
        return 'Not Connected';
      } else if (selectedDevice.metaData && selectedDevice.metaData.statusMode == $config.statusMode.CHARGING && selectedDevice.metaData.statusState == $config.statusState.START) {
        return 'Charging';
      } else if (selectedDevice.metaData && selectedDevice.metaData.cameraConnected) {
        if (typeof selectedDevice.metaData.cameraType == 'undefined') {
          return 'Connecting Camera';
        } else {
          return $camSettings.getCameraModel(selectedDevice.metaData);
        }
      } else {
        return 'No Camera';
      }
    };

    vm.checkForEnter = function(key){
      if (key == 13){
        //they've pressed the enter key on the keyboard - hide it
        cordova.plugins.Keyboard.close();
      }
    };

    vm.isConnected = function(device) {
      var connectedPulses = $device.getConnectedDevices();
      var isConnected = _.find(connectedPulses, (connectedPulse) => {
        return device.id == connectedPulse.id;
      });
      return isConnected;
    };

    vm.connectOrDisconnectDevice = function(device, $event) {
      $event.stopPropagation();

      var index;

      _.forEach(vm.localStorageDevices, (localStorageDevice, $index) => {
        if (localStorageDevice.id == device.id) {
          localStorageDevice.isScanning = true;
          if (vm.isDeviceActive(device)) {

            //disconnect device
            $device.disconnectPulse(device, false, false).then((response) => {
              localStorageDevice.isScanning = false;
            });
          } else {
            var timer = $timeout(() => {
              localStorageDevice.isScanning = false;
            }, 8000);
            device.bypass = true;
            //connect device
            $device.buildAndConnect(device, 0, 0, true).then((response) => {
              localStorageDevice.isScanning = false;
              $timeout.cancel(timer);
            }, (error) => {
              localStorageDevice.isScanning = false;
              $timeout.cancel(timer);
            });
          }
        }
      });
    };

    vm.getBattery = function(device) {
      return 'img/battery-75.svg';
    };

    vm.getImageSource = function(device) {
      if (device.isScanning) {
        return 'img/connect2.svg';
      } else {
        if (vm.isDeviceActive(device)) {
          return 'img/connected.svg';
        } else {
          return 'img/circle-white.svg';
        }
      }
    };

    vm.isDeviceActive = function(device) {
      var isActive = false;
      _.forEach($device.devices, (activeDevice) => {
        if (device.id == activeDevice.id) {
          isActive = true;
        }
      });
      return isActive;

    };

    vm.initiateScan = function() {
      if (isScanning) {
        return;
      }
      isScanning = true;
      console.log('scanning for pulses from devices page');
      $device.scanAndConnectDevices(3000, false, true).then((result) => {
        isScanning = false;
        $cordovaNativeStorage.getItem('devices').then((result) => {
          localStorageDevices = sortByConnectedDevices(result);
          vm.localStorageDevices = _.filter(localStorageDevices);
        });
      }, (error) => {
        isScanning = false;
      });

      $timeout(() => {
        //only show the spinner/scanning ui for 2 seconds regardless
        $scope.$broadcast('scroll.refreshComplete');
      }, 2000);
      $timeout(() => {
        if (isScanning) {
          isScanning = false;
        }
      }, 5000);
    };

    vm.expandOrCollapse = function($index) {
      if (vm.selectedRow != -1) {
        vm.selectedRow = -1;
      } else {
        vm.selectedRow = $index;
      }
    };


    vm.renameDevice = function($event, $index) {
      vm.editingRow = $index;
      $event.stopPropagation();
      vm.modelNickName = undefined;

    };

    vm.forgetDevice = function(device, $index) {
      var connectedDevices = $device.getConnectedDevices();
      var match = _.find(connectedDevices, (connectedDevice) => {
        return connectedDevice.id == device.id;
      });
      if (match) {
        //disconnect device
        $device.disconnectPulse(device, false, false).then((response) => {});
      }
      _.forEach(vm.localStorageDevices, (localStorageDevice, $index) =>{
        if (localStorageDevice.id == device.id){
          delete vm.localStorageDevices[$index];
          vm.localStorageDevices = _.filter(vm.localStorageDevices);
        }
      });
      delete localStorageDevices[device.id];

      $device.removeFromLocalStoage(device);
    };

    vm.isEmpty = function() {
      if (!localStorageDevices || localStorageDevices == 'undefined' || _.isEmpty(localStorageDevices)) {
        return true;
      } else {
        return false;
      }
    };

    vm.saveNickname = function(device, nickname) {
      vm.editingRow = -1;
      cordova.plugins.Keyboard.close();
      $transmit.renameDevice(device, nickname);
      $device.renameDevice(device, nickname, true).then((result) => {
        localStorageDevices = sortByConnectedDevices(result);
        vm.localStorageDevices = localStorageDevices;
      });
    };

    vm.getPD = function(device) {
      updatingFirmware = true;
      $timeout(() => {
        $transmit.getPersistentData(device);
      }, 2000);
    };

    vm.setPD = function(device) {
      updatingFirmware = true;
      $timeout(() => {
        $device.setTX($config.communication.SET_PERSISTENT_DATA);
        $transmit.setPersistentData(device, persistentData, 0);
      }, 2000);
    };

    vm.findPulse = function($event, device) {
      $event.stopPropagation();
      var matchedPulse = _.find(blinkingPulses, (pulse) => {
        return pulse.id == device.id;
      });
      if (matchedPulse) {
        vm.btnClass = '';
        device.blinking = false;
        $interval.cancel(matchedPulse.interval);
        blinkingPulses = _.remove(blinkingPulses, (blinkingPulse) => {
          blinkingPulse == device.id;
        });
        return;
      } else {
        vm.btnClass = 'active-search';
        device.blinking = true;
        $transmit.blinkLED(device, 2);
        blinkingPulses.push(device);
        device.interval = $interval(() => {
          //blink twice quickly, every 3 seconds
          $transmit.blinkLED(device, 2);
        }, 1000);

        $timeout(() => {
          vm.btnClass = '';
          device.blinking = false;
          //flash pulse LEDs for 1 minute
          $interval.cancel(device.interval);
        }, 60000);

      }

    };

    function sortByConnectedDevices(devices) {
      var localStorageDevices = _.sortBy(devices, [(lDevice) => {
        var connectedPulses = $device.getConnectedDevices();
        var isConnected = _.find(connectedPulses, (connectedPulse) => {
          return lDevice.id == connectedPulse.id;
        });
        lDevice.isConnected = isConnected;
        return lDevice.isConnected;
      }]);
      return localStorageDevices;
    }



  });

})();
