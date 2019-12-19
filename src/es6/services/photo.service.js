(function() {
  'use strict';
  pulse.services.factory('$photo', function($q, $config, $transmit, $timeout, $device, $rootScope, $camSettings, $interval, $views, btClassic) {

    var selectedDevice = $device.getSelectedDevice();

    var burstInterval;

    var settings = {
      inProgress: false
    };

    var thumbForcer;
    return {

      settings: settings,

      getPhotoSettings: function() {

        return $camSettings.getActiveSettings();
      },

      killForceThumb: function() {
        $timeout.cancel(thumbForcer);
      },

      takePhoto: function(device, blink = true, thumbForceWait = 0) {

        var deferred = $q.defer();
        if (!device) {
          deferred.reject('no device is connected');
        } else if (!device.metaData.cameraConnected) {
          deferred.reject('no camera connected');
        } else {
          if (device.btClassic.connected && device.btClassic.enabled) {

            //take the picture in safe mode
            if (blink) {
              $transmit.blinkLED(device);
            }

            $timeout(() => {
              $transmit.capture(device, false);
              $transmit.reportActivity();
              $timeout(()=>{
                this.getThumb(device, thumbForceWait).then((response) => {
                  deferred.resolve(response);
                }, (error) => {
                  deferred.reject(error);
                }, 100);
              });
            }, 40);

          } else {
            $transmit.blinkLED(device);
            $timeout(() => {
              //take the picture in fast mode
              $transmit.capture(device);
              if (device.metaData.cameraType == $config.cameraSettings.make.CANON) {
                var secondsTimestamp = Date.now() / 1000 | 0;
                if (!device.activityTime || (device.activityTime + 5) < secondsTimestamp) {
                  device.activityTime = secondsTimestamp;
                  $transmit.refreshUSB(device);
                }
              }
              $transmit.reportActivity();
              //btClassic is not connected. Don't ask for the thumb
              deferred.resolve();
            }, 40);

          }
        }

        return deferred.promise;
      },

      burst: function(device) {
        var deferred = $q.defer();
        if (!device) {
          deferred.reject('no device is connected');
        } else if (!device.metaData.cameraConnected) {
          deferred.reject('no camera connected');
        } else {
          $transmit.blinkLED(device);
          $timeout(() => {
            var cameraType = $camSettings.getCameraType(device.metaData);
            if (cameraType && cameraType.toLowerCase() == 'nikon') {
              $transmit.burstNikon(device);
              /*burstInterval = $interval(() => {
                $transmit.burstNikon(device);
              }, 500);*/
            } else {
              //canon
              $transmit.burstCanon(device);
            }
            deferred.resolve();
          }, 40);

        }

        return deferred.promise;

      },

      endBurst: function(device) {
        var deferred = $q.defer();
        if (!device) {
          deferred.reject('no device is connected');
        } else if (!device.metaData.cameraConnected) {
          deferred.reject('no camera connected');
        } else {
          var cameraType = $camSettings.getCameraType(device.metaData);
          if (cameraType && cameraType.toLowerCase() == 'nikon') {
            //$interval.cancel(burstInterval);
            deferred.resolve();
            return;
          } else {
            //canon
            $transmit.endBurstCanon(device);
          }
          deferred.resolve();

        }

        return deferred.promise;
      },

      getThumb: function(device, thumbForceWait = 0) {
        var deferred = $q.defer();
        //ensure we are connected
        console.log('calling isConnected MAC: ' + device.metaData.macAddress);
        if( thumbForceWait < 0 ){
          thumbForceWait = 0;
          console.log("thumbForceWait was <0!?!");
        }
        btClassic.isConnected(device.metaData.macAddress).then((response) => {
          $timeout(() => {
            //timestamp from the thumb request to the thumb completion
            device.waitingForThumb = true;
            $device.setDevice(device);
            var cameraMode = device.metaData.cameraMode;
            if (cameraMode != 'VIDEO' || $views.abortModes) {
              $transmit.requestThumb(device).then(() => {
                thumbForcer = $timeout(() => {
                  var syncedDevice = $device.getSelectedDevice();
                  //check to see if the thumb has already been rendered
                  if (syncedDevice.waitingForThumb) {
                    syncedDevice.waitingForThumb = false;
                    $device.setDevice(device);
                    // $transmit.cancelThumb(syncedDevice);
                    //read from BT CLASSIC then store to local storage, then render
                    console.log('no thumbnail acknowledgement sent. Doing a force read.');
                    btClassic.read(device.metaData.macAddress).then((data) => {
                      if (data && data.length) {
                        console.log('Read from BTClassic. Data length is ' + data.length);
                        $device.thumb(data, device);
                        deferred.resolve({
                          success: true
                        });
                      } else {
                        $rootScope.$broadcast('thumbnailUploadFailed');
                        deferred.resolve({
                          thumbCancel: true,
                          reason: 'pulse took to long to respond'
                        });
                        console.log('Attempted to read from BT Classic. Failed. Data was empty');
                      }
                    });
                  }
                }, 8000 + thumbForceWait); //wait 8 seconds for the thumb and then cancel nothing happened
              }, (error) => {
                console.log(error);
              });
            }
            else{
              deferred.reject({error: 'user is in video mode. Not requesting Thumb'});
            }
          }, 250);
        }, (error) => {
          deferred.resolve({
            thumbCancel: true,
            reason: 'bt classic connection dropped'
          });
          //bluetooth classic dropped somewhere
          device.btClassic.connected = false;
          device.btClassic.enabled = false;
          $device.setDevice(device);
          console.log(error + ' :BT CLASSIC has been disconnected');
        });
        return deferred.promise;
      }
    };

    function forceThumb(syncedDevice) {
      btClassic.read(syncedDevice.metaData.macAddress).then((data) => {
        if (data && data.length) {
          console.log('Read from BTClassic. Data length is ' + data.length);
          $device.thumb(data, syncedDevice);
        } else {
          console.log('Attempted to read from BT Classic. Failed. Data was empty');
          $rootScope.$broadcast('thumbnailUploadFailed');
        }
      }, () => {
        console.log('We went wrong with the BTClassic read');
        $rootScope.$broadcast('thumbnailUploadFailed');
      });
    }

  });
})();
