// Ionic Pulse App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'pulse' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
// 'pulse.services' is found in services.js
// 'puslse.controllers' is found in controllers.js
var pulse = {
  controllers: angular.module('pulse.controllers', []),
  services: angular.module('pulse.services', []),
  directives: angular.module('pulse.directives', []),
  filters: angular.module('pulse.filters', [])
};

var appVersion,
  devInfo,
  thumbCapable;
var logBackup = console.log;

var ip = '';

// Need to use these globals because firmware updates span multiple device
// sessions. Keep these to an absolute minimum
var persistentData = [];
var backupPD = [];
var getPD = true;
var setPD = false;
var ignorePD = false;
var updatingFirmware = false;

pulse.app = angular.module('pulse', [
  'ionic',
  'pulse.controllers',
  'pulse.services',
  'ngCordova',
  'ionic-native-transitions',
  'ksSwiper',
  'incrementer',
  'timeincrementer',
  'timer',
  'angular-svg-round-progressbar',
  'angularMoment',
  'chart.js',
  'ngCordova.plugins.nativeStorage'
]).run(function($ionicPlatform, $window, $rootScope, $cordovaStatusbar, $device, $fileLogger, $ionicNativeTransitions, $views, $timeout, $platform, $bulb, $camSettings, $location, $http, $transmit, $presetData, $cordovaNativeStorage, $testClient) {
  function setupStorageItems() {
    // * Check if it's first login!
    $cordovaNativeStorage.getItem('firstLogin').then((value) => {
      if (value) {
        $cordovaNativeStorage.setItem('firstLogin', parseInt(value) + 1);
      } else {
        $cordovaNativeStorage.setItem('firstLogin', 1);
      }
      if (window.cordova) {
        $device.scanAndConnectDevices();
      }
    }, (error) => {
      //they've never opened the app before
      $views.firstTime = true;
      $cordovaNativeStorage.setItem('firstLogin', 1);
      $cordovaNativeStorage.setItem('shouldWarnPicker', true);
      $location.path('/app/welcome');
    });

    $cordovaNativeStorage.getItem('permissableMode').then((permissableMode) => {
      $views.permissableMode = permissableMode;
    }, (error) => {
      $views.permissableMode = false;
    });
    $cordovaNativeStorage.getItem('menu-compatability').then(
      (compatabilityList) => {
        $views.invalidCameraList = compatabilityList;
      },
      (error) => {
        $cordovaNativeStorage.setItem('menu-compatability', $views.invalidCameraList);
      }
    );


    //***** setup the persistentData items!****/

    $cordovaNativeStorage.getItem('setPD').then((result) => {
      setPD = result;
    });
    $cordovaNativeStorage.getItem('persistentData').then((result2) => {
      if (result2) {
        persistentData = result2;
      } else {
        persistentData = [];
      }
    }, (error) => {
      persistentData = [];
    });

    /*** setup the bug report items *****/

    console.log("Enabling debug mode");
    console.log = function(input) {
      logBackup.apply(console, [":: " + input]);
      if ($fileLogger) {
        $fileLogger.log('debug', input);
      }
    };

    //console.log = logBackup;

    //set up the preset views
    $cordovaNativeStorage.getItem('presetViews').then((hasLoadedPresets) => {
      //presets already loaded. Do nothing
      return;
    }, (error) => {
      //presets have not been loaded
      $cordovaNativeStorage.setItem('presetViews', true).then(() => {
        var loadedPresets = $presetData.loadedPresets;
        $cordovaNativeStorage.getItem('presets').then((currentPresets) => {
          _.extend(currentPresets, loadedPresets);
          //user already has some presets. Add some more

          $cordovaNativeStorage.setItem('presets', currentPresets).then((response) => {});

        }, (error) => {
          //no presets currently exist. Set them up.
          $cordovaNativeStorage.setItem('presets', loadedPresets).then((response) => {});
        });
      });

    });
  }

  $http.get("http://ipinfo.io", {}).then((response) => {
    ip = response.data.ip;
    console.log("IP Address is: ", ip);
  }, (error) => {
    console.log('failed to get ip info: ' + error);
  });

  $rootScope.VERSION = window.VERSION;
  $rootScope.thumbCapable = true;

  $ionicPlatform.ready(function() {
    if (window.cordova) {
      $transmit.init();
      navigator.splashscreen.hide();
    }
    //$ionicNativeTransitions.enable(true, true);

    $fileLogger.checkFile().then((logFile) => {
      if (logFile.size > 150000) {
        $fileLogger.deleteLogfile().then(function() {
          console.log('Logfile deleted');
        });
      }
    });

    thumbCapable = true;
    devInfo = ionic.Platform.device();
    if (devInfo.model == "iPhone4,1" || devInfo.model == "iPad3,1" || devInfo.model == "iPad3,2" || devInfo.model == "iPad3,3") {
      thumbCapable = false;
      // These iDevices can not do iap2 - therefore no thumb
    }

    if (devInfo.model == "iPhone4,1") {
      $rootScope.iPhone4 = true;
    }

    $rootScope.thumbCapable = thumbCapable;

    setupStorageItems();

    // Restore FOTA context
    $rootScope.$on('scanBLE', () => {
      console.log("FOTA dropped out. Attempting to recover.");
      $device.scanAndConnectDevices();
    });

    $views.startUp = true;

    console.log('***** NEW APP SESSION: ' + moment().format("MMMM Do YYYY, h:mm:ss a") + '******');

    // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
    // for form inputs)
    if (window.cordova && window.cordova.plugins.Keyboard) {
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
    }
    if (window.cordova) {
      cordova.getAppVersion(function(version) {
        appVersion = version;
      });
    }

    $ionicPlatform.registerBackButtonAction(function(event) {
      if ($location.path() === '/app/main') {
        navigator.app.exitApp();
      } else {
        navigator.app.backHistory();
      }
      event.preventDefault();
    }, 100);
  });

  var in_bulb = false;
  $rootScope.$on('$stateChangeStart', function(e, toState, toParams, fromState, fromParams) {
    if (fromState.controller == 'BulbCtrl' && toState.controller != 'SettingsCtrl') {
      in_bulb = false;
      if ($bulb.settings.oldShutterIndex) {
        var device = $device.getSelectedDevice();
        if (device) {
          //we are leaving bulb mode, and we have an old shutter value we need to go back to
          $camSettings.updateSetting(device, 'shutter', $bulb.settings.oldShutterIndex);
        }
      }
    }
    if (toState.controller == 'BulbCtrl' && fromState.controller != 'SettingsCtrl') {
      var selectedDevice = $device.getSelectedDevice();
      //in android this callback is getting hit twice in a row so we need to only proceed if we aren't in t he bulb state yet
      if (!in_bulb && selectedDevice) {
        var bulbIndex = $device.findShutterIndex(selectedDevice, 'BULB', selectedDevice.metaData.camSettings.shutterOptions, false);
        var cameraType = $camSettings.getCameraType(selectedDevice.metaData);
        if ( typeof bulbIndex !== 'undefined') {
          console.log('Setting camera setting to bulb mode');
          //store the old shutter value so that we can reset to it when we leave the page
          $bulb.settings.oldShutterIndex = selectedDevice.metaData.camSettings.activeShutterIndex;
          $camSettings.updateSetting(selectedDevice, 'shutter', bulbIndex.shutterIndex);
        } else if (cameraType && cameraType.toLowerCase() == 'nikon') {
          $bulb.settings.oldShutterIndex = selectedDevice.metaData.camSettings.activeShutterIndex;
          //nikon shutter
          var byteArray = $views.integerToByteArray(0xFFFFFFFF);
          $transmit.setShutter(selectedDevice, byteArray);

        }
      }
      in_bulb = true; //mark that we've now entered bulb mode
    }
  });
}).config(function($stateProvider, $urlRouterProvider, $ionicConfigProvider, $ionicNativeTransitionsProvider, $compileProvider) {

  //$compileProvider.debugInfoEnabled(false); //enable this item to improve performance
  $compileProvider.imgSrcSanitizationWhitelist(/^\s*(https?|ftp|mailto|content|file|assets-library|cdvfile):|data:image\//);


  // Ionic uses AngularUI Router which uses the concept of states
  // Learn more here: https://github.com/angular-ui/ui-router
  // Set up the various states which the app can be in.
  // Each state's controller can be found in controllers.js
  $stateProvider

  // setup an abstract state for the tabs directive
    .state('app', {
    url: "/app",
    abstract: true,
    templateUrl: "templates/menu.html",
    controller: 'MainCtrl',
    controllerAs: 'vm'
  }).state('app.main', {
    url: '/main',
    templateUrl: 'templates/photo.html',
    controller: 'PhotoCtrl',
    menuItem: 'main',
    controllerAs: 'ctrl'

  }).state('app.video', {
    url: '/video',
    templateUrl: 'templates/video.html',
    controller: 'VideoCtrl',
    menuItem: 'video',
    controllerAs: 'ctrl'

  }).state('app.timelapse', {
    url: '/timelapse/:deviceId',
    templateUrl: 'templates/timelapse.html',
    controller: 'TimelapseCtrl',
    menuItem: 'timelapse',
    controllerAs: 'ctrl'
  }).state('app.savePreset', {
    url: '/savePreset',
    templateUrl: 'templates/savePreset.html',
    controller: 'SavePresetCtrl',
    controllerAs: 'ctrl'
  }).state('app.loadPreset', {
    url: '/loadPreset',
    templateUrl: 'templates/loadPreset.html',
    controller: 'LoadPresetCtrl',
    controllerAs: 'ctrl'
  }).state('app.timelapsemenu', {
    url: '/timelapsemenu/:deviceId',
    templateUrl: 'templates/timelapsemenu.html',
    controller: 'TimelapseMenuCtrl',
    controllerAs: 'ctrl'
  }).state('app.timelapsedelay', {
    url: '/timelapsedelay/:deviceId',
    templateUrl: 'templates/timelapsedelay.html',
    controller: 'TimelapseDelayCtrl',
    controllerAs: 'ctrl'
  }).state('app.exposure', {
    url: '/exposure/:deviceId',
    templateUrl: 'templates/exposure.html',
    controller: 'ExposureCtrl',
    controllerAs: 'ctrl'
  }).state('app.bulb', {
    url: '/bulb',
    templateUrl: 'templates/bulb.html',
    controller: 'BulbCtrl',
    menuItem: 'bulb',
    controllerAs: 'ctrl'
  }).state('app.photobooth', {
    url: '/photobooth',
    templateUrl: 'templates/photobooth.html',
    controller: 'PhotoboothCtrl',
    controllerAs: 'ctrl',
    menuItem: 'booth'
  }).state('app.devices', {
    url: '/devices',
    templateUrl: 'templates/devices.html',
    controller: 'DevicesCtrl',
    controllerAs: 'ctrl',
    menuItem: 'devices'
  }).state('app.settings', {
    url: '/settings/:deviceId',
    templateUrl: 'templates/settings.html',
    controller: 'SettingsCtrl',
    controllerAs: 'ctrl'
  }).state('app.appsettings', {
    url: '/appsettings',
    templateUrl: 'templates/appsettings.html',
    controller: 'AppSettingsCtrl',
    controllerAs: 'ctrl',
    menuItem: 'appsettings'
  }).state('app.about', {
    url: '/about',
    templateUrl: 'templates/about.html',
    controller: 'AboutCtrl',
    controllerAs: 'ctrl'
  }).state('app.bugreport', {
    url: '/bugreport',
    templateUrl: 'templates/bugreport.html',
    controller: 'BugReportCtrl',
    controllerAs: 'ctrl'
  }).state('app.hdr', {
    url: '/hdr',
    templateUrl: 'templates/hdr.html',
    controller: 'HdrCtrl',
    controllerAs: 'ctrl'
  }).state('app.welcome', {
    url: '/welcome',
    templateUrl: 'templates/welcome.html',
    controller: 'WelcomeCtrl',
    controllerAs: 'ctrl'
  }).state('app.updateFirmware', {
    url: '/updateFirmware',
    templateUrl: 'templates/update-firmware.html',
    controller: 'UpdateFirmwareCtrl',
    controllerAs: 'ctrl'
  });

  $urlRouterProvider.otherwise('app/main');
});
