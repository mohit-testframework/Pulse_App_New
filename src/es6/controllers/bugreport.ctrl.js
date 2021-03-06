(function() {
  'use strict';
  pulse.controllers.controller('BugReportCtrl', function($fileLogger, $http, $views, $device, $platform, $timeout, $firmware, $bugreport, $q, $cordovaNativeStorage) {
    var vm = this;
    var emailEndpoint = 'https://alpine-bug-report-server.herokuapp.com/main/email'; //our herokuapp that will send emails for us

    init();

    function init() {
      if (window.cordova) {
        cordova.plugins.Keyboard.disableScroll(true);
      }
      vm.viewSettings = {
        sent: false,
        btnText: 'Submit'
      };

      vm.bulbClass = 'hidden';

      vm.formSettings = $bugreport.settings;

      vm.views = $views;
      checkForFirmwareUpdate();
    }


    function checkForFirmwareUpdate(){
      var device = $device.getSelectedDevice();
      if (!device){
        return;
      }
      var s3firmware;
      $firmware.getMostRecentFirmwareVersion().then((version) => {
        s3firmware = $views.parseS3FirmwareFile(version);
        if (parseFloat(device.firmwareVersion) < s3firmware && $views.canDoAndroidFota()) {
          vm.showFirmwareWarning = true;
        }
      });
    }

    vm.sendErrorReport = function() {
      var firmwareType;
      var firmwareVersion;
      if (!vm.viewSettings.sent) {
        if (!validateEmail(vm.formSettings.email)){
          vm.bulbClass = 'animated fadeIn';
          $timeout(()=>{
            vm.bulbClass = 'animated fadeOut';
            $timeout(()=>{
              vm.bulbClass = 'hidden';
            }, 1000);
          }, 5000);
          return;
        }
        var device = $device.getSelectedDevice();
        vm.ellipsis = true;
        vm.error = false;

        $cordovaNativeStorage.getItem('firmwareVersion').then((fwVersion)=>{
          firmwareVersion = fwVersion;
        });
        $cordovaNativeStorage.getItem('firmwareType').then((fwType)=>{
          firmwareType = fwType;
        });

        $timeout(()=>{

          //initialize some other items that will be set in the email
          vm.formSettings.firmwareVersion = firmwareVersion ? firmwareVersion : 'Unable to get firmware version.';
          vm.formSettings.firmwareType = firmwareType ? firmwareType : 'Unable to get firmware type.';
          vm.formSettings.appVersion = appVersion;
          vm.formSettings.deviceVersion = $platform.getDeviceVersion();
          vm.formSettings.devicePlatform = $platform.getDevicePlatform();
          vm.formSettings.deviceModel = $platform.getDeviceModel();

          vm.viewSettings.btnText = 'Submitting';
          $fileLogger.getLogfile().then((logFile) => {
            vm.formSettings.attachment = logFile;
            sendLogFile(vm.formSettings).then((data) => {
              checkForNaughtyPeople();
              $bugreport.settings.comments = '';
            }, (error) => {
              console.log('failed to send debug email');
            });

          }, (error) => {
            delete vm.formSettings.attachment;
            //handle case where there is no log file
            sendLogFile(vm.formSettings).then((data) => {
              checkForNaughtyPeople();
              $bugreport.settings.comments = '';
            }, (error) => {
              console.log('failed to send debug email');
            });

          });

        }, 100);

      } else {
        vm.badWordOffender = false;
        vm.viewSettings.sent = false;
        vm.viewSettings.btnText = 'Submit';
      }
    };

    function checkForNaughtyPeople(){
      var badWords = ['shit', 'fuck'];
      _.forEach(badWords, (badWord) =>{
        if ($bugreport.settings.comments.toLowerCase().indexOf(badWord) != -1){
          vm.badWordOffender = true;
        }
    });
    }

    function sendLogFile(data, attempts = 0) {
      var defer = $q.defer();
      //make the post request to the heroku email app
      var request = $http.post(emailEndpoint, data);
      request.success((data) => {
        vm.viewSettings.sent = true;
        vm.ellipsis = false;
        vm.viewSettings.btnText = 'Send Another Bug';
        defer.resolve(data);
      });
      request.error((error) => {
        if (attempts < 1) {
          sendLogFile(data, 1);
        } else {
          vm.ellipsis = false;
          vm.error = true;
          defer.reject(error);
        }
      });
      return defer.promise;
    }

    function validateEmail(email) {
      var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
      return re.test(email);
    }

  });
})();
