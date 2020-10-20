'use strict';

(function () {
  'use strict';

  pulse.services.factory('$timelapse', function ($timeout, $interval, $q, $transmit, $device, $views, $camSettings, $rootScope, $config, $location, $cordovaNativeStorage, $stateParams) {

    //default
    var settings = {
      duration: {
        'hours': 1,
        'minutes': 0,
        'isInfinite': false
      },
      timer:null,
      interval: 5,
      isPaused: false,
      isActive: false,
      backgroundMode: false,
      backgroundTime: false,
      delay: {
        'hours': 0,
        'minutes': 1
      },
      activeDelay: false,
      activeExposure: false,
      activeBulbExposure: false,
      activeISOExposure: false,
      activeSpeedExposure: false,
      exposure: {
        startShutterIndex: false,
        shutterArray: [],
        endShutterIndex: false,
        startIsoIndex: false,
        isoArray: [],
        endIsoIndex: false,
        duration: {
          hours: 0,
          minutes: 0
        },
        delay: {
          hours: 0,
          minutes: 0
        }
      },
      exposureEV: false,
      deltaShutter: false,
      seconds: seconds,
      totalSeconds: totalSeconds,
      enumeratingTl: enumeratingTl,
      totalPhotos: totalPhotos
    };
    let timeInterval;
    var seconds, totalSeconds, totalPhotos;
    var enumeratingInterval = settings.interval;
    var enumeratingHours = settings.duration.hours;
    var enumeratingMinutes = settings.duration.minutes;

    var enumeratingTl = {};

    var timelapses = {};

    return {

      settings: settings,

      timelapses: timelapses,

      slideIndex: 0,

      initModel: function initModel(deviceId) {
        console.log('inside initModel');

        if (timelapses[deviceId]) {
           console.log('inside timelapses[deviceId]');
          return timelapses;
        } else {
          console.log('else timelapses[deviceId]');
          timelapses[deviceId] = {
            settings: {
              duration: {
                'hours': 1,
                'minutes': 0,
                'isInfinite': false
              },
              timer:null,
              interval: 5,
              isPaused: false,
              isActive: false,
              backgroundMode: false,
              backgroundTime: false,
              delay: {
                'hours': 0,
                'minutes': 1
              },
              activeDelay: false,
              activeExposure: false,
              activeBulbExposure: false,
              activeISOExposure: false,
              activeSpeedExposure: false,
              exposure: {
                startShutterIndex: false,
                shutterArray: [],
                endShutterIndex: false,
                startIsoIndex: false,
                isoArray: [],
                endIsoIndex: false,
                duration: {
                  hours: 0,
                  minutes: 0
                },
                delay: {
                  hours: 0,
                  minutes: 0
                }
              },
              exposureEV: false,
              deltaShutter: false,
              slideIndex: 0,
              seconds: seconds,
              totalSeconds: totalSeconds,
              enumeratingTl: enumeratingTl,
              totalPhotos: totalPhotos
            }
          };
          return timelapses;
        }
      },

      /**
       * setSeconds - sets the total seconds global for the view & other calculations
       * @return {null}
       */
      setSeconds: function setSeconds(deviceId) {
        console.log('inside setSeconds 1  : ' + timelapses[deviceId].settings.interval);
        timelapses[deviceId].settings.seconds = this.calculateTotalMinutes(deviceId) * 60 - timelapses[deviceId].settings.interval; //since we take a photo at the start of the TL, we need to initally subtract the interval
        timelapses[deviceId].settings.totalSeconds = timelapses[deviceId].settings.seconds;
        console.log('Seconds Values : ' + timelapses[deviceId].settings.seconds);
        console.log('total Seconds Values : ' + timelapses[deviceId].settings.totalSeconds);
      },

      restartTimelapseFromAppClose: function restartTimelapseFromAppClose(data) {
        console.log('inside restartTimelapseFromAppClose');
        //app was closed and reopened and there was an active TL in progress, re-render the UI

        if (data && data.device && data.savedTl) {
          var deviceId = data.device.id;

          var tlSession = data.savedTl[deviceId];
          if (tlSession) {
            //2. set the initial variables
            timelapses[deviceId].settings.duration = tlSession.settings.duration;
            timelapses[deviceId].settings.interval = tlSession.settings.interval;
            timelapses[deviceId].settings.isActive = true;
            this.getTotalPhotos(deviceId);
            this.setSeconds(deviceId);
            //3. calculate progress based on the initial variable/ updated TL ticker
            this.calculateRestartDiff(tlSession, deviceId);
          }
        }
      },

      calculateRestartDiff: function calculateRestartDiff(data, deviceId) {
        console.log('inside calculateRestartDiff');
        var device = $device.getSelectedDevice();
        var currentPhotoCount = device.metaData.statusState;
        timelapses[deviceId].settings.enumeratingTl = {};

        timelapses[deviceId].settings.seconds = (timelapses[deviceId].settings.totalPhotos - currentPhotoCount) * timelapses[deviceId].settings.interval;

        timelapses[deviceId].settings.enumeratingTl.seconds = currentPhotoCount * timelapses[deviceId].settings.interval;
        timelapses[deviceId].settings.enumeratingTl.completionPercentage = 100 - Math.round(timelapses[deviceId].settings.seconds / timelapses[deviceId].settings.totalSeconds * 100);
        if (timelapses[deviceId].settings.enumeratingTl.completionPercentage > 100) {
          timelapses[deviceId].settings.enumeratingTl.completionPercentage = 100;
        }
        timelapses[deviceId].settings.enumeratingTl.photos = currentPhotoCount;

        var hoursAndMinutes = calculateMinutesAndHoursFromSeconds(timelapses[deviceId].settings.totalSeconds - timelapses[deviceId].settings.seconds);
        timelapses[deviceId].settings.enumeratingTl.minutes = hoursAndMinutes.minutes;
        timelapses[deviceId].settings.enumeratingTl.hours = hoursAndMinutes.hours;

        //fire up the ui
        this.start(device, false, true);
      },

      renderMinutes: function renderMinutes(deviceId) {
        // console.log('inside renderMinutes');
        var finalString;
        if (deviceId) {
          var minuteString = timelapses[deviceId].settings.duration.minutes.toString();
          if (minuteString.length == 1) {
            finalString = '0' + minuteString;
          } else {
            finalString = minuteString;
          }
        }
        return finalString;
      },

      /**
       * calculateTotalMinutes - determines the total minutes a timelapse is set for
       * @return {int} the number of total minutes
       */
      calculateTotalMinutes: function calculateTotalMinutes(deviceId) {
        // console.log('inside calculateTotalMinutes 1  : ' + timelapses[deviceId].settings.duration.hours);

        // console.log('inside calculateTotalMinutes 2  : ' + timelapses[deviceId].settings.duration.minutes);
        var minutes;
        if (deviceId) {
          minutes = parseInt(timelapses[deviceId].settings.duration.hours) * 60 + parseInt(timelapses[deviceId].settings.duration.minutes);
        }
        return minutes;
      },

      /**
       * prepareCountDownObject - prepates various countdown values that will be rendered in the view and sets them in the enumeratingTl object
       * @return {null}
       */
      prepareCountDownObject: function prepareCountDownObject(deviceId) {
        console.log('inside prepareCountDownObject');
        this.setSeconds(deviceId);
        timelapses[deviceId].settings.enumeratingTl = {
          interval: timelapses[deviceId].settings.interval,
          completionPercentage: 0,
          hours: 0,
          minutes: '00',
          seconds: 0,
          photos: 1
        };
      },

      /**
       * getTotalPhotos- calculates the total amount of photos that will happen in a timelapse
       * @return {int} the total amount of photos
       */
      getTotalPhotos: function getTotalPhotos(deviceId) {
        // console.log('inside getTotalPhotos');
        var s = this.calculateTotalMinutes(deviceId) * 60;
        var totalPhotos;
        if (deviceId) {
          timelapses[deviceId].settings.totalPhotos = Math.floor(s / timelapses[deviceId].settings.interval);
          totalPhotos = timelapses[deviceId].settings.totalPhotos;
        }
        return totalPhotos;
      },

      getLivePhotos: function getLivePhotos(seconds, currentPhotoCount, deviceId) {
        console.log('inside getLivePhotos');
        var photos;
        if (deviceId) {
          photos = Math.floor(seconds / timelapses[deviceId].settings.interval);
          if (photos > timelapses[deviceId].settings.totalPhotos) {
            //we cant have less than 0 photos left
            photos = timelapses[deviceId].settings.totalPhotos;
          }
        }
        return photos;
      },

      /**
       * pause - pauses a timelapse
       * @return {null}
       */
      pause: function pause(device) {
        var kill = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

        var deviceId;
        if (device && device.id) {
          deviceId = device.id;
        } else {
          deviceId = $stateParams.deviceId;
        }

        if (timelapses[deviceId].settings.isPaused) {
          //already paused, get out
          return;
        } else {
          if (!kill) {
            $transmit.pauseTimelapse(device);
          } else {
            $transmit.killTimelapse(device);
          }
          timelapses[deviceId].settings.isPaused = true;

          //kill the timer
          $interval.cancel(timeInterval);
        }
      },

      /**
       * kill - pauses a timelapse and flips a model variable
       * @return {null}
       */
      kill: function kill(device) {
        this.pause(device, true);
        timelapses[device.id].settings.isActive = false;
        $cordovaNativeStorage.remove('timelapse');
      },

      pauseUI: function pauseUI(deviceId) {
        $interval.cancel(timeInterval);
      },

      getAndSetSettingsValues: function getAndSetSettingsValues(deviceId) {
        var defer = $q.defer();
        var device = $device.getSelectedDevice();
        var exposureShutterValue = timelapses[deviceId].settings.exposure.shutterArray[timelapses[deviceId].settings.exposure.startShutterIndex];
        var exposureIsoValue = timelapses[deviceId].settings.exposure.isoArray[timelapses[deviceId].settings.exposure.startIsoIndex];
        var shutterByteArray = $views.integerToByteArray(exposureShutterValue.byte);
        var isoByteArray = $views.integerToByteArray(exposureIsoValue.byte);
        $transmit.setShutter(device, shutterByteArray);
        $transmit.setIso(device, isoByteArray);
        defer.resolve();
        return defer.promise;
      },

      sendTlData: function sendTlData(device) {
        if (!timelapses) {
          timelapses = [];
        }
        var delay;
        var deviceId = device.id;
        var brampingData;
        if (timelapses[deviceId].settings.activeDelay) {
          var seconds = (parseInt(timelapses[deviceId].settings.delay.hours) * 60 + parseInt(timelapses[deviceId].settings.delay.minutes)) * 60;

          delay = {
            seconds: seconds
          };
        }
        if (timelapses[deviceId].settings.activeExposure) {
          this.getAndSetSettingsValues(deviceId).then(function () {
            console.log('gettings settings values');
          });
          brampingData = this.getBrampingData(deviceId);
        }
       else if (timelapses[deviceId].settings.activeBulbExposure) {
          this.getAndSetSettingsValues(deviceId).then(function () {
            console.log('gettings settings values');
          });
          brampingData = this.getBrampingData(deviceId);
        }  else if (timelapses[deviceId].settings.activeISOExposure) {
          this.getAndSetSettingsValues(deviceId).then(function () {
            console.log('gettings settings values');
          });
          brampingData = this.getBrampingData(deviceId);
        }  else if (timelapses[deviceId].settings.activeSpeedExposure) {
          this.getAndSetSettingsValues(deviceId).then(function () {
            console.log('gettings settings values');
          });
          brampingData = this.getBrampingData(deviceId);
        }
        $transmit.timelapse(device, parseInt(timelapses[deviceId].settings.interval), timelapses[deviceId].settings.totalPhotos, delay, brampingData, timelapses[deviceId].settings.duration.isInfinite);
      },

      getBrampingData: function getBrampingData(deviceId) {

        var totalTimeInMinutes = parseInt(timelapses[deviceId].settings.exposure.duration.hours) * 60 + parseInt(timelapses[deviceId].settings.exposure.duration.minutes);
        var evChangePerTen = timelapses[deviceId].settings.exposureEV / (totalTimeInMinutes / 10);
        var expPower = parseInt(($config.maxPacketValue / 2 + evChangePerTen * 20).toFixed(0)); // The value * 10 positive/negative
        var frontDelayTime = (timelapses[deviceId].settings.exposure.delay.hours * 60 + timelapses[deviceId].settings.exposure.delay.minutes) / 5;

        var deltaShutter = Math.round(Math.abs(timelapses[deviceId].settings.deltaShutter * 6));

        return {
          expPower: expPower,
          totalTimeInMinutes: totalTimeInMinutes,
          frontDelayTime: frontDelayTime,
          deltaShutter: deltaShutter
        };
      },

      checkForExposureErrors: function checkForExposureErrors(deviceId) {
        var error;
        var totalTimeInMinutes = parseInt(timelapses[deviceId].settings.exposure.duration.hours) * 60 + parseInt(timelapses[deviceId].settings.exposure.duration.minutes),
            frontDelayTime = parseInt(timelapses[deviceId].settings.exposure.delay.hours) * 60 + parseInt(timelapses[deviceId].settings.exposure.delay.minutes),
            totalTlTime = parseInt(timelapses[deviceId].settings.duration.hours) * 60 + parseInt(timelapses[deviceId].settings.duration.minutes);

        if (totalTimeInMinutes + frontDelayTime > totalTlTime) {
          error = {
            message: 'Duration + delay cannot be longer than total timelapse duration.'
          };
        }
        if (timelapses[deviceId].settings.exposureEV) {

          if (Math.abs(timelapses[deviceId].settings.exposureEV / ((parseInt(timelapses[deviceId].settings.exposure.duration.hours) * 60 + parseInt(timelapses[deviceId].settings.exposure.duration.minutes)) / 10.0)) > 5.00) {
            error = {
              message: 'Your eV change is too fast. Please set something slower than 5eV per 10 minutes.'
            };
          }
        }

        if (timelapses[deviceId].settings.exposure.shutterArray.length && timelapses[deviceId].settings.exposure.isoArray.length) {
          var shutterEV = $views.computeDeltaEVShutter($views.str2Num(timelapses[deviceId].settings.exposure.shutterArray[timelapses[deviceId].settings.exposure.startShutterIndex].value), $views.str2Num(timelapses[deviceId].settings.exposure.shutterArray[timelapses[deviceId].settings.exposure.endShutterIndex].value));
          var isoEV = $views.computeDeltaEVIso($views.str2Num(timelapses[deviceId].settings.exposure.isoArray[timelapses[deviceId].settings.exposure.startIsoIndex].value), $views.str2Num(timelapses[deviceId].settings.exposure.isoArray[timelapses[deviceId].settings.exposure.endIsoIndex].value));
          
          if (Math.abs(isoEV) != 0 && Math.abs(shutterEV) == 0) {
            error = {
              message: 'Rut roh. Exposure ramping requires changing both ISO and Shutter Speed.'
            };
          }

          // if (isoEV < 0 && shutterEV > 0) {
          //   error = {
          //     message: 'Rut roh. Pulse cannot ramp a negative ISO setting and a positive shutter speed simultaneously.'
          //   };
          // }

          // if (isoEV > 0 && shutterEV < 0) {
          //   error = {
          //     message: 'Rut roh. Pulse cannot ramp a positive ISO settings and a negative shutter speed simultaneously.'
          //   };
          // }
        }
        return error;
      },
      checkForISOExposureErrors: function checkForISOExposureErrors(deviceId) {
        var error;
        var totalTimeInMinutes = parseInt(timelapses[deviceId].settings.exposure.duration.hours) * 60 + parseInt(timelapses[deviceId].settings.exposure.duration.minutes),
            frontDelayTime = parseInt(timelapses[deviceId].settings.exposure.delay.hours) * 60 + parseInt(timelapses[deviceId].settings.exposure.delay.minutes),
            totalTlTime = parseInt(timelapses[deviceId].settings.duration.hours) * 60 + parseInt(timelapses[deviceId].settings.duration.minutes);

        if (totalTimeInMinutes + frontDelayTime > totalTlTime) {
          error = {
            message: 'Duration + delay cannot be longer than total timelapse duration.'
          };
        }
        if (timelapses[deviceId].settings.exposureEV) {

          if (Math.abs(timelapses[deviceId].settings.exposureEV / ((parseInt(timelapses[deviceId].settings.exposure.duration.hours) * 60 + parseInt(timelapses[deviceId].settings.exposure.duration.minutes)) / 10.0)) > 5.00) {
            error = {
              message: 'Your eV change is too fast. Please set something slower than 5eV per 10 minutes.'
            };
          }
        }

        if (timelapses[deviceId].settings.exposure.shutterArray.length && timelapses[deviceId].settings.exposure.isoArray.length) {
          var shutterEV = $views.computeDeltaEVShutter($views.str2Num(timelapses[deviceId].settings.exposure.shutterArray[timelapses[deviceId].settings.exposure.startShutterIndex].value), $views.str2Num(timelapses[deviceId].settings.exposure.shutterArray[timelapses[deviceId].settings.exposure.endShutterIndex].value));
          var isoEV = $views.computeDeltaEVIso($views.str2Num(timelapses[deviceId].settings.exposure.isoArray[timelapses[deviceId].settings.exposure.startIsoIndex].value), $views.str2Num(timelapses[deviceId].settings.exposure.isoArray[timelapses[deviceId].settings.exposure.endIsoIndex].value));
          
          // if (Math.abs(isoEV) != 0 && Math.abs(shutterEV) == 0) {
          //   error = {
          //     message: 'Rut roh. Exposure ramping requires changing both ISO and Shutter Speed.'
          //   };
          // }

          // if (isoEV < 0 && shutterEV > 0) {
          //   error = {
          //     message: 'Rut roh. Pulse cannot ramp a negative ISO setting and a positive shutter speed simultaneously.'
          //   };
          // }

          // if (isoEV > 0 && shutterEV < 0) {
          //   error = {
          //     message: 'Rut roh. Pulse cannot ramp a positive ISO settings and a negative shutter speed simultaneously.'
          //   };
          // }
        }
        return error;
      },

      updateExposureValues: function updateExposureValues(settingType, currentSlide, deviceId) {
        if (settingType == 'startShutter') {
          timelapses[deviceId].settings.exposure.startShutterIndex = currentSlide;
        } else if (settingType == 'endShutter') {
          timelapses[deviceId].settings.exposure.endShutterIndex = currentSlide;
        } else if (settingType == 'startIso') {
          timelapses[deviceId].settings.exposure.startIsoIndex = currentSlide;
        } else if (settingType == 'endIso') {
          //endIso
          timelapses[deviceId].settings.exposure.endIsoIndex = currentSlide;
        }
      },

      getExposureDeltaEV: function getExposureDeltaEV(startShutterVal, startIsoVal, endShutterVal, endIsoVal, deviceId) {
        var ev = $views.computeDeltaEV($views.str2Num(startShutterVal), $views.str2Num(startIsoVal), $views.str2Num(endShutterVal), $views.str2Num(endIsoVal));
        timelapses[deviceId].settings.exposureEV = ev.deltaEv;
        timelapses[deviceId].settings.deltaShutter = ev.deltaShutter;
        return ev;
      },

      /**
       * start - fires off a time lapse
       * @return {null}
       */
      start: function start(device) {
        console.log('Inside start');
        var _this = this;

        var isResuming = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
        var comingFromAppClose = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

        $transmit.refreshUSB(device, 1);
        var deviceId = device.id;
        if (isResuming) {

          //coming from a paused state, resume the TL
          $transmit.resumeTimelapse(device);
        }
        //sync the interval
        else {
            if (!comingFromAppClose) {
              this.prepareCountDownObject(deviceId);
              //store the initial timelapse settings
              $cordovaNativeStorage.setItem('timelapse', timelapses);
            }
          }
        timelapses[deviceId].settings.isActive = true;

        var deferred = $q.defer();
        timelapses[deviceId].settings.isPaused = false;
        // timelapses[deviceId].settings.enumeratingTl = {};
        // timeInterval = null;
        if(timeInterval){
          console.log('Inside timeInterval If');
          $interval.cancel(timeInterval);
        }else {
          console.log('Inside timeInterval Else');
        }
       
         timeInterval = $interval(function () {
          console.log('backgroundMode : ' + timelapses[deviceId].settings.backgroundMode);

          if (timelapses[deviceId].settings.backgroundMode) {
            console.log('Inside backgroundMode');
            console.log('Inside backgroundMode backgroundTime : ' + timelapses[deviceId].settings.backgroundTime);
            console.log('Inside backgroundMode seconds : ' + timelapses[deviceId].settings.seconds);
            console.log('Inside backgroundMode deviceId : ' + deviceId);
            //the app was in background mode, we need to figure out where we left off
            timelapses[deviceId].settings.seconds = subtractBackgroundSeconds(parseInt(timelapses[deviceId].settings.backgroundTime), parseInt(timelapses[deviceId].settings.seconds), deviceId);
            timelapses[deviceId].settings.enumeratingTl.seconds = subtractEnumeratingBackgroundSeconds(parseInt(timelapses[deviceId].settings.backgroundTime), parseInt(timelapses[deviceId].settings.enumeratingTl.seconds));
            timelapses[deviceId].settings.enumeratingTl.photos = _this.getLivePhotos(parseInt(timelapses[deviceId].settings.enumeratingTl.seconds), parseInt(timelapses[deviceId].settings.enumeratingTl.photos), deviceId);
          } else {
            console.log('else backgroundMode');
            timelapses[deviceId].settings.seconds = parseInt(timelapses[deviceId].settings.seconds) - 1;
            timelapses[deviceId].settings.enumeratingTl.seconds = parseInt(timelapses[deviceId].settings.enumeratingTl.seconds) + 1;
          }

          //minutes and hours get set in the view
          var hoursAndMinutes = calculateMinutesAndHoursFromSeconds(parseInt(timelapses[deviceId].settings.enumeratingTl.seconds));
          timelapses[deviceId].settings.enumeratingTl.hours = hoursAndMinutes.hours;
          timelapses[deviceId].settings.enumeratingTl.minutes = hoursAndMinutes.minutes;

          //calculate the completion center for the view
           console.log('seconds value *********&&&&& : ' + timelapses[deviceId].settings.seconds);
           console.log('totalSeconds value *********&&&&& : ' + timelapses[deviceId].settings.totalSeconds);
           let devideSeconds = parseInt(timelapses[deviceId].settings.seconds) / parseInt(timelapses[deviceId].settings.totalSeconds);

          timelapses[deviceId].settings.enumeratingTl.completionPercentage = 100 - Math.round((devideSeconds * 100));
           console.log('completionPercentage value **********&&&&&: ' + timelapses[deviceId].settings.enumeratingTl.completionPercentage);
           // console.log('Math.round *********&&&&& : ',  Math.round(((parseInt(timelapses[deviceId].settings.seconds) / parseInt(timelapses[deviceId].settings.totalSeconds)) * 100));); 
           
          if (parseInt(timelapses[deviceId].settings.enumeratingTl.completionPercentage) >= 100) {
            //we cant go past 100% complete!!
            console.log('************************** inside greater than 100 *****************');
            timelapses[deviceId].settings.enumeratingTl.completionPercentage = 100;
          }
          if (parseInt(timelapses[deviceId].settings.seconds) <= 0) {
            console.log('************************** inside less than 0 *****************');
            //we've finished the timelapse
            $interval.cancel(timeInterval);
            timelapses[deviceId].settings.timer = null;
            timelapses[deviceId].settings.backgroundTime = false;
            $rootScope.$broadcast('timelapseFinished', {
              deviceId: deviceId
            });
            deferred.resolve();
          }
          if (parseInt(timelapses[deviceId].settings.enumeratingTl.interval) > 1) {
            //keep counting down the interval timer
            timelapses[deviceId].settings.enumeratingTl.interval = timelapses[deviceId].settings.enumeratingTl.interval - 1;
            if (device && device.metaData) {
              if (device.metaData.statusMode == $config.statusMode.TIMELAPSE && device.metaData.statusState != timelapses[deviceId].settings.enumeratingTl.photos) {
                // console.log('timelapse is out of sync, resyncing');
                _this.reSyncTimelapse(deviceId);
              }
            }
          } else {
            //interval is resetting, subtract a photo
            var photos = parseInt(timelapses[deviceId].settings.enumeratingTl.photos) + 1;
            if (photos > timelapses[deviceId].settings.totalPhotos) {
              timelapses[deviceId].settings.enumeratingTl.photos = timelapses[deviceId].settings.totalPhotos;
            } else {
              timelapses[deviceId].settings.enumeratingTl.photos = photos;
            }
            timelapses[deviceId].settings.enumeratingTl.interval = timelapses[deviceId].settings.interval;
          }
        }, 1000); /*1 seconds interval*/

        // $scope.$on('$destroy', function() {
        //   // Make sure that the interval is destroyed too
        //   console.log('inside destroyed');
        //   $interval.cancel(timeInterval);
        // });
        
        return deferred.promise;
      },

      //this gets called if we notice the UI picture count is out of sync with the picture count from the status mode ticker
      reSyncTimelapse: function reSyncTimelapse(deviceId) {
        console.log('inside reSyncTimelapse');
        var unregister = $rootScope.$on('timelapseTaken', function (event, data) {
          timelapses[deviceId].settings.enumeratingTl.photos = data.pictureCount;

          //reset the interval
          timelapses[deviceId].settings.enumeratingTl.interval = settings.interval;
          //this.enumeratingTl.seconds = (Math.round((totalPhotos - this.enumeratingTl.photos) * settings.interval));
          //unregister the listener
          unregister();
        });
      }

    };

    /**
     * calculateMinutesAndHoursFromSeconds - determines minutes and hours from an integer representing seconds
     * @param  {int} totalSeconds - the number of seconds
     * @return {object}  - object reperesenting the hours and minutes
     */
    function calculateMinutesAndHoursFromSeconds(seconds) {
      console.log('Inside calculateMinutesAndHoursFromSeconds');
      var hours = Math.floor(seconds / 3600);
      var minutes = Math.floor((seconds - hours * 3600) / 60);
      if (minutes.toString().length == 1) {
        minutes = '0' + minutes;
      }
      var result = {
        hours: hours,
        minutes: minutes
      };
      return result;
    }

    function subtractBackgroundSeconds(timeAtBackground, currentSecondValue, deviceId) {
      console.log('Inside subtractBackgroundSeconds');
      var curTime = Date.now();

      var diff = Math.round((curTime - timeAtBackground) / 1000);
      timelapses[deviceId].settings.backgroundMode = false;

      var newSecondval = currentSecondValue - diff;
      if (newSecondval < 0) {
        return 0;
      } else {
        return newSecondval;
      }
    }

    function subtractEnumeratingBackgroundSeconds(timeAtBackground, currentSecondValue) {
      console.log('Inside subtractEnumeratingBackgroundSeconds');
      var curTime = Date.now();

      var diff = Math.round((curTime - timeAtBackground) / 1000);

      var newSecondval = currentSecondValue + diff;

      return newSecondval;
    }

    /**
     * getMinutes - calculates the number of minutes from seconds
     * @param  {int} totalSeconds - the number of seconds
     * @return {int}  - the calculated number of minutes
     */
    function getMinutes(totalSeconds) {
      console.log('Inside getMinutes');
      var minuteDivisor = totalSeconds % (60 * 60);
      var minutes = Math.floor(minuteDivisor / 60).toString();
      if (minutes.length < 2) {
        minutes = '0' + minutes;
      }
      return minutes;
    }
  });
})();