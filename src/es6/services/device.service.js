(function() {
  "use strict";
  pulse.services.factory("$device", function(
    $cordovaNativeStorage,
    $q,
    $timeout,
    $views,
    $config,
    $transmit,
    $rootScope,
    $cordovaFile,
    $platform,
    $fileSystem,
    $fileLogger,
    $ionicNativeTransitions,
    btClassic,
    $ionicHistory,
    BLE,
    $location,
    $ionicLoading,
    $firmware,
    $cordovaVibration
  ) {
    var status = {
      icon: "fa fa-th-large",
      activity: "scanNotStarted"
    };

    var devices = {
      sessionDevices: []
    };

    var decorruptJpegArray = function(data) {
      var byte = 0,
        corruptStart = 0,
        corruptEnd = 0;
      for (byte = 0; byte < data.byteLength; byte++) {
        if (data[byte] === 0x00 && data[byte + 1] === 0xff) {
          if (data[byte + 2] === 0x00 && data[byte + 3] === 0xff) {
            console.log("DETECTED START OF JPEG CORRUPTION");
            corruptStart = byte;
            break;
          }
        }
      }

      for (byte = corruptStart; byte < data.byteLength; byte++) {
        if (data[byte] === 0x00 && data[byte + 1] === 0xfe) {
          if (data[byte + 2] === 0x00 && data[byte + 3] === 0xfe) {
            console.log("DETECTED END OF JPEG CORRUPTION");
            corruptEnd = byte + 3;
            break;
          }
        }
      }

      if (corruptEnd > 0 && corruptStart > 0) {
        console.log(
          "Corruption detected { " + corruptStart + " , " + corruptEnd + " }"
        );
        var thumbnail_buff_copy = new Uint8Array(20000);
        var byteCopy = 0;
        for (byte = 0; byte < data.byteLength; byte++) {
          if (byte < corruptStart || byte > corruptEnd) {
            thumbnail_buff_copy[byteCopy] = data[byte];
            byteCopy++;
          }
        }

        data = thumbnail_buff_copy;
      }
      return data;
    };

    function convertThumb(data, pulse) {
      data = decorruptJpegArray(data);
      var blob,
        iter = 0;

      try {
        blob = new Blob([data], {
          type: "image/jpeg"
        });
      } catch (e) {
        var BlobBuilder =
          window.BlobBuilder ||
          window.WebKitBlobBuilder ||
          window.MozBlobBuilder ||
          window.MSBlobBuilder;

        var builder = new BlobBuilder();
        builder.append(data.buffer);
        blob = builder.getBlob("image/jpeg");
      }

      console.log(Date.now() + ": Blob is: ", JSON.stringify(blob));
      var path, dir;
      var fileName = "pulseThumb" + Date.now() + ".jpg";
      if (!$platform.isAndroid()) {
        path = cordova.file.documentsDirectory;
        dir = "Documents/thumbnails/" + fileName;
      } else {
        path = cordova.file.externalApplicationStorageDirectory;
        dir =
          cordova.file.externalApplicationStorageDirectory +
          "thumbnails/" +
          fileName;
      }

      $fileSystem.saveThumb(path, fileName, blob).then(
        success => {
          var data = {
            hasThumb: true,
            thumbPath: dir
          };
          $rootScope.$broadcast("thumbnailUpload", data);
        },
        error => {
          var data = {
            hasThumb: false
          };
          $rootScope.$broadcast("thumbnailUpload", data);
        }
      );
    }

    var handleSettings = function(device, changeMode = true) {
      refreshShutter(device).then(() => {
        refreshAperture(device).then(() => {
          refreshIso(device).then(() => {
            if (changeMode) {
              device.metaData.newSession = false;
              device.shouldBroadcast = true;
              refreshMode(device).then(() => {
                setDeviceToSessionDevices(device);
              });
            } else {
              setDeviceToSessionDevices(device);
            }
          });
        });
      });
    };

    var getCommsData = function(device) {
      var deferred = $q.defer();
      ble.read(
        device.id,
        $config.services.GATT_SERVICE_UUID_PULSE_COMMS_SERVICE,
        $config.characteristics.GATT_CHAR_UUID_UART_TX,
        function(response) {
          deferred.resolve(response);
        },
        function(error) {
          deferred.reject();
          console.log("failed to read UART TX");
        }
      );
      return deferred.promise;
    };

    var refreshNickname = function(device) {
      ble.read(
        device.id,
        $config.services.GATT_SERVICE_UUID_DEV_INFO_SERVICE,
        $config.characteristics.GATT_CHAR_UUID_NICKNAME,
        function(data) {
          console.log("got the nickname");
          device.callbacks.changeNickname(data);
        },
        function() {
          console.log("failed to read nickname on startup");
        }
      );
    };

    var refreshMode = function(device) {
      var deferred = $q.defer();
      ble.read(
        device.id,
        $config.services.GATT_SERVICE_UUID_PULSE_SETTINGS_SERVICE,
        $config.characteristics.GATT_CHAR_UUID_CAM_MODE,
        function(data) {
          device.callbacks.changeMode(data);
          deferred.resolve();
        },
        function() {
          console.log("failed to read camera mode on startup");
        }
      );
      return deferred.promise;
    };

    var refreshShutter = function(device) {
      var deferred = $q.defer();
      ble.read(
        device.id,
        $config.services.GATT_SERVICE_UUID_PULSE_SETTINGS_SERVICE,
        $config.characteristics.GATT_CHAR_UUID_SHUTTER,
        function(data) {
          console.log("successfully read shutter");
          device.callbacks.changeShutter(data);
          deferred.resolve();
        },
        function() {
          console.log("failed to read shutter on startup");
        }
      );
      return deferred.promise;
    };

    var refreshAperture = function(device) {
      var deferred = $q.defer();
      ble.read(
        device.id,
        $config.services.GATT_SERVICE_UUID_PULSE_SETTINGS_SERVICE,
        $config.characteristics.GATT_CHAR_UUID_APERTURE,
        function(data) {
          device.callbacks.changeAperture(data);
          deferred.resolve();
        },
        function() {
          console.log("failed to read aperture on startup");
        }
      );
      return deferred.promise;
    };

    var refreshIso = function(device) {
      var deferred = $q.defer();
      ble.read(
        device.id,
        $config.services.GATT_SERVICE_UUID_PULSE_SETTINGS_SERVICE,
        $config.characteristics.GATT_CHAR_UUID_ISO,
        function(data) {
          device.callbacks.changeIso(data);
          deferred.resolve();
        },
        function() {
          console.log("failed to read iso on startup");
        }
      );
      return deferred.promise;
    };

    var setDeviceToSessionDevices = function(device) {
      _.forEach(devices.sessionDevices, sessionDevice => {
        if (device.id == sessionDevice.id) {
          sessionDevice.metaData = device.metaData;
          sessionDevice.btClassic = device.btClassic;
          sessionDevice.firmwareVersion = device.firmwareVersion;
        }
      });
    };

    var handleMeta = function(data, device) {
      device.metaData.rxBuffer.set(data, device.metaData.rxPointer);
      device.metaData.rxPointer += data.length;
    };

    var parseMeta = function(device) {
      console.log("Finished buffering meta packet. Beginning Parse.");
      parseRemaining(device.metaData.rxBuffer, device);
    };

    var parseRemaining = function(data, device) {
      var element, remainder, offset;
      offset = 2;

      element = data.subarray(1, data[1] + offset);
      remainder = data.subarray(data[1] + offset, data.length);

      switch (data[0]) {
        case $config.parseTags.SHUTTER_ARRAY: {
          parseShutterArray(element, device);
          parseRemaining(remainder, device);
          break;
        }
        case $config.parseTags.ISO_ARRAY: {
          parseISOArray(element, device);
          parseRemaining(remainder, device);
          break;
        }
        case $config.parseTags.APERTURE_ARRAY: {
          parseApertureArray(element, device);
          parseRemaining(remainder, device);
          break;
        }
        case $config.parseTags.MAC_ADDRESS: {
          console.log("setting unguarded mac address : ");
          parseMacAddress(element, device);
          parseRemaining(remainder, device);
          break;
        }
        case $config.parseTags.CAM_MODEL: {
          parseCamModel(element, device);
          parseRemaining(remainder, device);
          break;
        }
        case $config.parseTags.CAM_TYPE: {
          parseCamType(element, device);
          // parseRemaining(remainder, device);
          break;
        }
        default:
          break;
      }
    };

    var prepareData = function(device) {
      setShutter(device);
      setAperture(device);
      setIso(device);
    };

    var ensureMeta = function(device) {
      /* make sure we have metaData for:
      1. camera model
      2. mac address
      */

      if (!device.metaData.cameraModel.length) {
        console.log("ensureMeta: did not receive camera model");
        return false;
      } else if (typeof device.metaData.cameraType == "undefined") {
        console.log("ensureMeta: did not receive camera type");
        return false;
      } else {
        console.log("MetaData check passed");
        return true;
      }
    };

    var setShutter = function(device) {
      var masterShutter;
      if (device.metaData.cameraType === 0) {
        masterShutter = $config.cameraSettings.canonShutter;
      } else {
        masterShutter = $config.cameraSettings.nikonShutter;
      }
      _.forEach(device.metaData.shutterArray, item => {
        if (masterShutter[item]) {
          device.metaData.camSettings.shutterOptions.push({
            value: masterShutter[item],
            byte: item
          });
        }
      });
      if (!device.metaData.camSettings.shutterOptions.length) {
        device.metaData.camSettings.shutterOptions.push({
          value: "AUTO",
          byte: false,
          isFake: true
        });
      } else {
        //remove AUTO from the Array
        device.metaData.camSettings.shutterOptions = _.remove(
          device.metaData.camSettings.shutterOptions,
          shutterOption => {
            return !shutterOption.isFake;
          }
        );
      }
      if (device.metaData.cameraType === 0) {
        //it's a canon, reverse the shutter Array
        _.reverse(device.metaData.camSettings.shutterOptions);
      } else {
        if ($views.doesModelSupport(device, "bulb")) {
          device.metaData.camSettings.shutterOptions.push({
            value: "BULB",
            byte: 0xffffffff
          });
        }
      }
      return device;
    };

    var setAperture = function(device) {
      var masterAperture;
      if (device.metaData.cameraType === 0) {
        masterAperture = $config.cameraSettings.canonAperture;
      } else {
        masterAperture = $config.cameraSettings.nikonAperture;
      }
      _.forEach(device.metaData.apertureArray, item => {
        if (masterAperture[item]) {
          device.metaData.camSettings.apertureOptions.push({
            value: masterAperture[item],
            byte: item
          });
        }
      });
      if (!device.metaData.camSettings.apertureOptions.length) {
        device.metaData.camSettings.apertureOptions.push({
          value: "AUTO",
          byte: false,
          isFake: true
        });
      } else {
        //remove AUTO from the Array if it's there
        device.metaData.camSettings.apertureOptions = _.remove(
          device.metaData.camSettings.apertureOptions,
          apertureOption => {
            return !apertureOption.isFake;
          }
        );
      }
      return device;
    };

    var setIso = function(device) {
      var masterIso;
      if (device.metaData.cameraType === 0) {
        masterIso = $config.cameraSettings.canonIso;
      } else {
        masterIso = $config.cameraSettings.nikonIso;
      }
      _.forEach(device.metaData.isoArray, item => {
        if (masterIso[item]) {
          device.metaData.camSettings.isoOptions.push({
            value: masterIso[item],
            byte: item
          });
        }
      });
      if (!device.metaData.camSettings.isoOptions.length) {
        device.metaData.camSettings.isoOptions.push({
          value: "AUTO",
          byte: false,
          isFake: true
        });
      } else {
        //remove AUTO from the Array if it's there
        device.metaData.camSettings.isoOptions = _.remove(
          device.metaData.camSettings.isoOptions,
          isoOption => {
            return !isoOption.isFake;
          }
        );
      }
      return device;
    };

    var parseShutterArray = function(data, device) {
      console.log("parsing shutterArray");
      device.metaData.shutterArray = [];
      var length = data[0];
      var index = 0;
      var iterator = 0;
      var item;
      var list = data.subarray(1, data.length);
      while (iterator < length / 4) {
        item = list[index++];
        item |= list[index++] << 8;
        item |= list[index++] << 16;
        item |= list[index++] << 24;
        iterator++;
        //remove duplicates
        if (_.indexOf(device.metaData.shutterArray, item) < 0) {
          device.metaData.shutterArray.push(item);
        }
      }
      device.metaData.shutterArray.sort(function(a, b) {
        return a - b;
      });
      console.log(
        "Parsed shutter array. Shutter values are: " +
          device.metaData.shutterArray
      );
    };

    var parseApertureArray = function(data, device) {
      console.log("parsing apertureArray");
      device.metaData.apertureArray = [];

      var length = data[0];
      var index = 0;
      var iterator = 0;
      var item;
      var list = data.subarray(1, data.length);
      while (iterator < length / 4) {
        item = list[index++];
        item |= list[index++] << 8;
        item |= list[index++] << 16;
        item |= list[index++] << 24;
        iterator++;
        //remove duplicates
        if (_.indexOf(device.metaData.apertureArray, item) < 0) {
          device.metaData.apertureArray.push(item);
        }
      }
      device.metaData.apertureArray.sort(function(a, b) {
        return a - b;
      });
      console.log(
        "Parsed aperture array. Aperture values are: " +
          device.metaData.apertureArray
      );
    };

    var parseISOArray = function(data, device) {
      console.log("parsing isoArray");
      device.metaData.isoArray = [];
      var length = data[0];
      var index = 0;
      var iterator = 0;
      var item;
      var list = data.subarray(1, data.length);
      while (iterator < length / 4) {
        item = list[index++];
        item |= list[index++] << 8;
        item |= list[index++] << 16;
        item |= list[index++] << 24;
        iterator++;
        //remove duplicates
        if (_.indexOf(device.metaData.isoArray, item) < 0) {
          device.metaData.isoArray.push(item);
        }
      }
      device.metaData.isoArray.sort(function(a, b) {
        return a - b;
      });
      console.log(
        "Parsed ISO array. ISO values are: " + device.metaData.isoArray
      );
    };

    var parseMacAddress = function(data, device, length) {
      console.log("parsing macAddress");
      device.metaData.macAddress = "";
      var incrementer;

      var stringMap = "0123456789ABCDEF";
      if (!length) {
        length = data[0];
        incrementer = 1;
      } else {
        incrementer = 0;
      }

      for (var i = 0; i < length; i++) {
        device.metaData.macAddress +=
          stringMap[(data[i + incrementer] >> 4) & 0x0f];
        device.metaData.macAddress += stringMap[data[i + incrementer] & 0x0f];
        if (i < length - 1) {
          device.metaData.macAddress += ":";
        }
      }
      console.log("macAddress is now : " + device.metaData.macAddress);
    };

    var parseCamModel = function(data, device) {
      console.log("parsing cam model");
      device.metaData.cameraModel = "";
      var length = data[0];
      if (length > 0) {
        for (var i = 0; i < length; i++) {
          device.metaData.cameraModel += String.fromCharCode(data[i + 1]);
        }
      } else {
        device.metaData.cameraModel = "Camera";
      }

      console.log("cam model is: " + device.metaData.cameraModel);
    };

    var parseCamType = function(data, device) {
      console.log("parsing cam type");

      var length = data[0];
      console.log("camera type is " + data[1]);
      device.metaData.cameraType = data[1];
    };

    var analyticsToGet = [
      $config.analyticTypes.PHOTOS,
      $config.analyticTypes.VIDEOS,
      $config.analyticTypes.TIMELAPSES,
      $config.analyticTypes.THUMBNAILS,
      $config.analyticTypes.SESSIONS,
      $config.analyticTypes.UPTIME,
      $config.analyticTypes.TL_COMPLETE,
      $config.analyticTypes.LONG_EXPOSURE
    ];

    var resetATG = function() {
      analyticsToGet = [
        $config.analyticTypes.PHOTOS,
        $config.analyticTypes.VIDEOS,
        $config.analyticTypes.TIMELAPSES,
        $config.analyticTypes.THUMBNAILS,
        $config.analyticTypes.SESSIONS,
        $config.analyticTypes.UPTIME,
        $config.analyticTypes.TL_COMPLETE,
        $config.analyticTypes.LONG_EXPOSURE
      ];
    };

    var isValidCamera = function(model) {
      var isValid = true;
      //strip bad characters
      var strippedModel = model.replace("\0", "");
      if ($views.invalidCameraList.indexOf(strippedModel) > -1) {
        isValid = false;
      }
      return isValid;
    };

    var enableCameraMenus = function(device) {
      $firmware.syncMenuCompatability().then(() => {
        if (isValidCamera(device.metaData.cameraModel)) {
          $transmit.enableMenus(device);
        }
      });
    };

    var mtuDone = false;
    var txOperation = 0;
    var harvestPromise, metaPromise;

    var modeRefreshTime = Date.now();

    var META_PAGE_TIMEOUT = 500;

    var removeA = function removeA(arr) {
      var what,
        a = arguments,
        L = a.length,
        ax;
      while (L > 1 && arr.length) {
        what = a[--L];
        while ((ax = arr.indexOf(what)) !== -1) {
          arr.splice(ax, 1);
        }
      }
      return arr;
    };

    function handleTimelapseReconnect(pulse, state) {
      $cordovaNativeStorage.getItem("timelapse").then(
        savedTl => {
          $ionicNativeTransitions.locationUrl("/app/timelapse/" + pulse.id, {
            type: "slide",
            direction: "left"
          });
          var tlData = {
            pictureCount: state,
            device: pulse,
            savedTl: savedTl
          };
          $timeout(() => {
            //wait a second for the timelapse controller to init from page load
            $rootScope.$broadcast("timelapseReconnect", tlData);
          }, 1000);
        },
        error => {
          //didn't find any saved TLs don't do anything
        }
      );
    }

    function handleVideoReconnect(pulse) {
      $cordovaNativeStorage.getItem("video").then(
        savedVideo => {
          $ionicNativeTransitions.locationUrl("/app/video", {
            type: "slide",
            direction: "left"
          });

          var videoStart = savedVideo.startTime;
          var ellapsedTime = (Date.now() - videoStart) / 1000;
          var videoData = {
            ellapsedSeconds: Math.round(ellapsedTime) + 1 //add one because we are waiting a second to broadcast
          };
          $timeout(() => {
            //wait a second for the timelapse controller to init from page load
            $rootScope.$broadcast("videoReconnect", videoData);
          }, 1000);
        },
        error => {
          //no saved video record, don't do anything
        }
      );
    }

    function handleBulbReconnect(pulse) {
      $cordovaNativeStorage.getItem("bulb").then(
        savedBulb => {
          if (savedBulb.settings.isTimed) {
            //multiply the minutes (actually seconds!!) to get MS
            //multiply the hours (actually minutes!!) to get MS
            var exposureLengthMs =
              parseInt(savedBulb.duration.timed.minutes) * 1000 +
              parseInt(savedBulb.duration.timed.hours) * 6000;
            if (Date.now() > exposureLengthMs + savedBulb.startTime) {
              return;
            }
          }
          $ionicNativeTransitions.locationUrl("/app/bulb", {
            type: "slide",
            direction: "left"
          });

          $timeout(() => {
            var ellapsedTime = savedBulb.startTime;
            var bulbData = {
              ellapsedMs: ellapsedTime + 1000, //add 1000 MS because we are waiting a second to broadcast
              settings: savedBulb.settings,
              duration: savedBulb.duration
            };

            //wait a second for the timelapse controller to init from page load
            $rootScope.$broadcast("bulbReconnect", bulbData);
          }, 1000);
        },
        error => {
          //no saved video record, don't do anything
        }
      );
    }

    return {
      devices: [],
      sessionDevices: devices.sessionDevices,

      setTX: function(op) {
        txOperation = op;
      },

      status: status,

      initMetaData: function(device) {
        return {
          rxBuffer: new Uint8Array(1024),
          rxPointer: 0,
          cameraConnected: false,
          shutterArray: [],
          isoArray: [],
          apertureArray: [],
          cameraModel: "",
          macAddress: "",
          battery: undefined,
          cameraType: undefined,
          statusMode: undefined,
          statusState: undefined,
          isPhotoBoothing: false,
          requestingMeta: false,
          newSession: true,
          camSettings: {
            shutterOptions: [],
            apertureOptions: [],
            isoOptions: [],
            activeShutterIndex: 0,
            activeIsoIndex: 0,
            activeApertureIndex: 0
          }
        };
      },

      increaseMTU: function(device) {
        var deferred = $q.defer();

        if ($platform.isAndroid()) {
          console.log("Attempting to increase MTU");
          ble.requestMtu(
            device.id,
            158,
            mtu => {
              $timeout(() => {
                console.log("mtu set to: " + mtu);
                $transmit.setMTU(mtu - 3);
                deferred.resolve();
              }, 10000);
            },
            error => {
              $timeout(() => {
                console.log(
                  "Firmware updates not supported on this device: " + error
                );
                deferred.resolve();
              }, 10000);
            }
          );
        } else {
          deferred.resolve();
        }

        return deferred.promise;
      },

      resetMetaData: function(
        device,
        cameraConnected = false,
        fullRefresh = true
      ) {
        device.metaData.rxBuffer = new Uint8Array(1024);
        device.metaData.rxPointer = 0;
        device.metaData.cameraConnected = cameraConnected;
        device.metaData.shutterArray = [];
        device.metaData.isoArray = [];
        device.metaData.apertureArray = [];
        if (fullRefresh) {
          device.metaData.newSession = true;
          device.metaData.cameraModel = "";
          //device.metaData.macAddress = '';
          device.metaData.cameraType = undefined;
        }
        device.metaData.camSettings.shutterOptions = [];
        device.metaData.camSettings.apertureOptions = [];
        device.metaData.camSettings.isoOptions = [];
        device.metaData.camSettings.activeShutterIndex = 0;
        device.metaData.camSettings.activeIsoIndex = 0;
        device.metaData.camSettings.activeApertureIndex = 0;
        return device;
      },

      /**
       * function initDevice - builds the initial device object for attempt to connect to it
       * @param  {object} device the device to initially configure
       * @return {null}
       */
      initDevice: function(device) {
        var that = this;
        device.name = device.name || "Pulse";
        device.id = device.id;
        device.waitingForThumb = false;
        device.cameraScanComplete = false;
        device.metaDataFetches = 0;
        device.firmwareVersion = "";
        device.btClassic = {
          enabled: device.btClassic ? device.btClassic.enabled : false,
          connected: device.btClassic ? device.btClassic.connected : false
        };
        device.metaData = this.initMetaData();
      },

      initDeviceCallbacks: function(device) {
        var that = this;
        return {
          changeAperture: function(buffer) {
            that.changeAperture(buffer, device);
          },
          changeIso: function(buffer) {
            that.changeIso(buffer, device);
          },
          changeShutter: function(buffer) {
            that.changeShutter(buffer, device);
          },
          changeMode: function(buffer) {
            that.changeMode(buffer, device);
          },
          handleBattery: function(buffer) {
            that.handleBattery(buffer, device);
          },
          handleStatusMode: function(buffer) {
            that.handleStatusMode(buffer, device);
          },
          handleStatusState: function(buffer) {
            that.handleStatusState(buffer, device);
          },
          commsSuccess: function(rxData) {
            that.commsSuccess(rxData, device);
          },
          pulseAck: function(rxData) {
            that.pulseAck(rxData, device);
          },
          changeNickname: function(buffer) {
            that.handleNickname(buffer, device);
          },
          subscriptionFailure: function(error) {
            console.log(
              "Failed to subscribe to device: " + device.id + "Error: " + error
            );
          },
          commsFailure: function(error) {
            console.log(
              "Failed to subscribe to Comms Service for device: " +
                device.id +
                "Error: " +
                error
            );
          },
          disconnectCallback: function(error) {
            that.handleDisconnect(device);
          }
        };
      },

      /**
       * function handleDisconnect - wrapper around disconnecting a pulse
       * @param  {object} device - the device to disconnect
       * @return {null}
       */
      handleDisconnect: function(device) {
        this.disconnectPulse(device).then(result => {});
      },

      /**
       * deviceExists - checks if a given device is already present in our ConnectedDevice List
       * @param  {object} incomingDevice -- the device to check
       * @return {boolean}  whether or not the device already exists in our connected list
       */
      deviceExists: function(incomingDevice, deviceArray) {
        var alreadyExists = _.find(deviceArray, device => {
          return device.id == incomingDevice.id;
        });
        if (alreadyExists) {
          return true;
        } else {
          return false;
        }
      },

      /**
       * scanAndConnectDevices - wrapper around the big scanAndConnect function, handles UI header display item and calls scanAndConnect
       * @return {promise}
       */
      scanAndConnectDevices: function(timeout, deferred, isManual = false) {
        if (!deferred) {
          deferred = $q.defer();
        }
        this.handleOutOfSyncDevices().then(() => {
          ble.isEnabled(
            () => {
              $views.isScanning = true;
              //stop any current scans, and start a new scan
              ble.stopScan();
              this.scanAndConnect(timeout, isManual).then(
                result => {
                  $views.isScanning = false;
                  deferred.resolve(result);
                },
                error => {
                  deferred.resolve(error);
                }
              );
              return deferred.promise;
            },
            () => {
              console.log("bluetooth is not enabled");
              $timeout(() => {
                this.scanAndConnectDevices(timeout, deferred, isManual);
              }, 1000);
            }
          );
        });
        return deferred.promise;
      },

      handleOutOfSyncDevices: function(skip = false) {
        var deferred = $q.defer();
        deferred.resolve();
        /*if (skip){
          deferred.resolve();
        }
        else{
          ble.list('1901', (deviceIds) => {
            var connectedPulses = this.getConnectedDevices();
            var connectedIds = _.map(connectedPulses, 'id');
            var difference = _.difference(deviceIds, connectedIds);
            _.forEach(difference, (id, index) => {
              console.log('out of sync device: disconnecting: ' + id);
              this.disconnectPulse({
                id: id
              }, false, false).then(() => {
                if (difference.length == index + 1){
                  deferred.resolve();
                }
              });
            });
            if (!difference.length){
              deferred.resolve();
            }
          });
        }*/
        return deferred.promise;
      },

      /**
       * clearInactiveSessionDevices - removes any device that isn't currently connected from the session array
       * @return {null} operates directly on the array
       */
      clearInactiveSessionDevices: function() {
        _.remove(session.sessionDevices, sessionDevice => {
          return !sessionDevice.isConnected;
        });
      },

      removeFromLocalStoage: function(device) {
        $cordovaNativeStorage.getItem("devices").then(localStorageDevices => {
          delete localStorageDevices[device.id];
          $cordovaNativeStorage.setItem("devices", localStorageDevices);
        });
      },

      /**
       * function scanAndConnect - scans BLE devices and connects to the one named Pulse
       * @param {integer} timeout - (optional) the amount of time to wait before stopping the scan
       * @return {promise}
       */
      scanAndConnect: function(timeout, isManual = false) {
        if (!window.cordova) {
          BLE.noCordova();
        }
        $views.isScanning = true;
        var deferred = $q.defer();
        var that = this;

        var scanArray = [];
        if ($platform.isAndroid()) {
          //scanArray = [$config.services.GATT_SERVICE_UUID_PULSE_COMMS_SERVICE, $config.bootloader.BL_SERVICE];
        }
        BLE.scan(scanArray, timeout).then(
          peripheral => {
            //If bootloader handoff to firmware update
            if (
              peripheral &&
              peripheral.name &&
              peripheral.name == "Pulse Bootloader"
            ) {
              peripheral.callbacks = {
                disconnectCallback: function() {
                  that.handleDisconnect(peripheral);
                }
              };

              // Try and connect in 6 seconds to make sure its not just a charging unit
              $timeout(() => {
                BLE.connect(peripheral).then(dev => {
                  console.log("Connected to a pulse bootloader");
                  if (dev) {
                    this.increaseMTU(dev).then(() => {
                      $firmware.readUpdateFirmware().then(fw => {
                        updatingFirmware = true;
                        $firmware.settings.firmwareBinary = fw;
                        $firmware.settings.bootloaderDevice = dev;
                        if ($location.path() == "/app/updateFirmware") {
                          setPD = true; // Need to set persistent data on next connect
                          $cordovaNativeStorage.setItem("setPD", setPD);
                          $firmware.update(
                            new Uint8Array($firmware.settings.firmwareBinary),
                            $firmware.settings.bootloaderDevice
                          );
                        } else {
                          $location.path("/app/updateFirmware");
                        }
                      });
                    });
                  }
                });
              }, 6000);
            } else {
              if (!BLE.devices.length) {
                deferred.resolve(status);
                return;
              }
              var dl = BLE.devices.length,
                counter = 0,
                pulseDevices = [],
                connected;

              _.forEach(BLE.devices, device => {
                pulseDevices.push(device);
              });
              if (!pulseDevices.length) {
                //none of the devices were pulses, let's just GTFO
                deferred.resolve(status);
              }
              this.buildAndConnect(
                pulseDevices[0],
                counter,
                timeout,
                isManual
              ).then(response => {
                deferred.resolve(response);
              });
            }
          },
          error => {
            //scan failure callback
            deferred.resolve(status);
          }
        );

        return deferred.promise;
      },

      /**
       * getConnectedDevices - returns the list of currently connected Devices
       * @return {array} list of connected pulses
       */
      getConnectedDevices: function() {
        return _.filter(devices.sessionDevices, device => {
          return device.isConnected;
        });
      },

      /**
       * buildAndConnect - takes a device, builds its data object and then attempts to connect to it
       * @param  {object} device  the device to build and connect to
       * @param  {int} variable to says which pulse to mark as the selected pulse
       * @return {promise}   when final connection is achieved
       */
      buildAndConnect: function(
        device,
        counter,
        timeout,
        isManual,
        connectAnyway = true
      ) {
        var deferred = $q.defer();
        this.cameraPromise = deferred;
        console.log("building pulse device object");
        //build the initial device
        var pulse = device;
        this.initDevice(device);
        pulse.callbacks = this.initDeviceCallbacks(pulse);
        console.log(pulse.callbacks);

        this.fetchDeviceFromLocalStorage(pulse).then(localStorageInfo => {
          if (localStorageInfo) {
            if (
              localStorageInfo.status ==
                $config.localStorageStatus.DEVICE_NOT_FOUND &&
              !connectAnyway
            ) {
              if (isManual) {
                deferred.resolve({
                  status: $config.localStorageStatus.DEVICE_NOT_FOUND,
                  device: pulse
                });
              } else {
                //device is not the device we have in local storage, get out
                deferred.resolve();
              }
              return deferred.promise;
            }

            if (localStorageInfo.device) {
              pulse.localStorageInfo = localStorageInfo.device;
            }
          }
          if (!this.deviceExists(pulse, devices.sessionDevices)) {
            devices.sessionDevices.push(pulse);
          }
          BLE.connect(pulse).then(
            connectedDevice => {
              if ($location.path() == "/app/timelapse/") {
                //user connected while on the timelapse page. Take them to the device specific TL page
                $location.path("/app/timelapse/" + connectedDevice.id);
              }

              if (!timeout && !connectAnyway) {
                console.log("connected to a device. stopping scan");
                BLE.stopScan();
              }

              this.getStatusMode(pulse).then(mode => {
                this.getStatusState(pulse).then(state => {
                  if ($views.startUp) {
                    //yep the app just reopened
                    $views.startUp = false;
                    //only do this stuff when the app reopens

                    //timelapse mode
                    if (
                      mode == $config.statusMode.TIMELAPSE &&
                      state != $config.statusState.COMPLETE
                    ) {
                      handleTimelapseReconnect(pulse, state);
                    }

                    //video mode
                    if (mode == $config.statusMode.VIDEO) {
                      handleVideoReconnect(pulse);
                    }

                    //bulb mode
                    if (mode == $config.statusMode.BULB) {
                      handleBulbReconnect(pulse);
                    }
                  }
                });
              });

              this.getBatteryLevel(pulse);
              refreshNickname(pulse);

              if (device.bypass) {
                deferred.resolve();
              }

              if (!connectedDevice) {
                deferred.resolve();
                return;
              }
              this.setSessionDeviceToActiveOrInactive(pulse, true);

              $timeout(() => {
                this.increaseMTU(pulse).then(() => {
                  mtuDone = true;
                  console.log("mtu is done. subscribing to notifications");
                  this.startSubscription(pulse);
                });

                $timeout(() => {
                  if (mtuDone === false) {
                    console.log(
                      "mtu is not done. continuing with connection process anyways"
                    );
                    this.startSubscription(pulse);
                  } else {
                    console.log(
                      "connection process went as expected, resetting mtu flag"
                    );
                    mtuDone = false;
                  }
                }, 3000);
              }, 3000);

              //append the more device info now that we have achieve connection
              pulse.services = connectedDevice.services;
              pulse.characteristics = connectedDevice.characteristics;
              pulse.advertising = connectedDevice.advertising;
              pulse.rssi = connectedDevice.rssi;
              pulse.ledLevel = 100;
              pulse.isMainDevice = false;
              pulse.isSelected = true;

              if (
                !devices.sessionDevices ||
                devices.sessionDevices.length <= 1
              ) {
                pulse.isMainDevice = true;
              }

              //check local storage for the device
              this.buildLocalStorageDevice(pulse).then(localStorageObj => {
                this.setLocalStorageOnSessionDevice(pulse, localStorageObj);
                pulse.localStorageInfo = localStorageObj;
                this.devices.push(pulse);

                if (connectAnyway) {
                  deferred.resolve(pulse);
                }
              });
            },
            error => {
              console.log("failed to connect to device. Error: " + error);
              ble.stopScan();
              if (isManual) {
                deferred.reject(error);
              }
            }
          );
        });

        return deferred.promise;
      },

      cameraPromise: undefined,

      postSubscribe: function(pulse) {
        {
          if (!devices.sessionDevices || devices.sessionDevices.length <= 1) {
            pulse.isMainDevice = true;
          }

          if (!setPD) {
            $transmit.getFirmwareType(pulse);
            $transmit.getFirmWareVersion(pulse);
            $transmit.getMacAddress(pulse);

            $timeout(() => {
              this.checkForCameraConnection(pulse).then(
                result => {
                  console.log("we have a camera connection!");
                  //everything worked so far now try to connect over BT Classic
                  if (this.cameraPromise) {
                    this.cameraPromise.resolve();
                  }
                },
                error => {
                  console.log(
                    "not connecting to BT Classic. Failed to get camera status"
                  );
                }
              );
            });
          } else {
            console.log("Just updated firmware. Need to set persistent data");
            for (var i = 0; i < persistentData.length; i++) {
              console.log(persistentData[i]);
            }

            console.log("Finishing update process in 5 seconds.");
            $timeout(() => {
              ignorePD = true;
              $transmit.getPersistentData(pulse);
              $timeout(() => {
                txOperation = $config.communication.SET_PERSISTENT_DATA;
                $transmit.setPersistentData(pulse, persistentData, 0);

                setPD = false;
                $cordovaNativeStorage.setItem("setPD", false);
                ignorePD = false;

                $timeout(() => {
                  $location.path("app/main");
                  $ionicLoading.hide();
                }, 1000);
              }, 1500);
            }, 3000);
          }
        }
      },

      getStatusMode: function(device) {
        var deferred = $q.defer();
        var that = this;
        ble.read(
          device.id,
          $config.services.GATT_SERVICE_UUID_STATUS_SERVICE,
          $config.characteristics.GATT_CHAR_UUID_STATUS_MODE,
          function(data) {
            var mode = that.handleStatusMode(data, device);
            deferred.resolve(mode);
          },
          function() {
            console.log("failed to read status mode from pulse");
          }
        );
        return deferred.promise;
      },

      getStatusState: function(device) {
        var deferred = $q.defer();
        var that = this;
        ble.read(
          device.id,
          $config.services.GATT_SERVICE_UUID_STATUS_SERVICE,
          $config.characteristics.GATT_CHAR_UUID_STATUS_STATE,
          function(data) {
            var status = that.handleStatusState(data, device);
            deferred.resolve(status);
          },
          function() {
            console.log("failed to read status state from pulse");
          }
        );
        return deferred.promise;
      },

      getBatteryLevel: function(device) {
        var deferred = $q.defer();
        var that = this;
        ble.read(
          device.id,
          $config.services.GATT_SERVICE_UUID_BATT_SERVICE,
          $config.characteristics.GATT_CHAR_UUID_BATTERY_STATUS,
          function(data) {
            that.handleBattery(data, device);
            deferred.resolve();
          },
          function() {
            console.log("failed to read battery from pulse");
          }
        );
        return deferred.promise;
      },

      checkForCameraConnection: function(device, defer) {
        if (!defer) {
          defer = $q.defer();
        }
        var matchingDevice = _.find(devices.sessionDevices, sessionDevice => {
          return sessionDevice.id == device.id;
        });

        if (!matchingDevice) {
          defer.resolve({
            success: false,
            device: device
          });
          return defer.promise;
        }
        //var selectedDevice = this.getSelectedDevice();
        if (matchingDevice.isConnected) {
          if (!matchingDevice.metaData.cameraConnected && !updatingFirmware) {
            $transmit.camStatus(device);

            $timeout(() => {
              this.checkForCameraConnection(device, defer);
            }, 1000);
          } else {
            //camera is connected. Attempt to connect on bluetooth classic
            console.log(
              "No longer polling for camera, camera is already connected"
            );
            defer.resolve({
              success: true,
              device: matchingDevice
            });
            return defer.promise;
          }
        } else {
          console.log("Pulse is no longer connected. Killing camera scan");
          defer.reject({
            error: "camera was disconnected"
          });
        }
        return defer.promise;
      },

      /**
       * setLocalStorageOnSessionDevice - places the local storage object on a device
       * @param  {object} device the device to attach the localStorageObj to
       * @param  {object} localStorageObj - the object to attach
       * @return {null}
       */
      setLocalStorageOnSessionDevice: function(device, localStorageObj) {
        _.forEach(devices.sessionDevices, (sessionDevice, $index) => {
          if (device.id == sessionDevice.id) {
            devices.sessionDevices[$index].localStorageInfo = localStorageObj;
            return false;
          }
        });
      },

      /**
       * setSessionDeviceToActiveOrInactive - operates on the Session Device array - setting to whether or not they are connected
       * @param  {obj} device    the device to operate on
       * @param  {boolean} setActive whether to set the device to connected or not
       * @return {null}    operates directly on the array
       */
      setSessionDeviceToActiveOrInactive: function(device, setActive) {
        _.forEach(devices.sessionDevices, (sessionDevice, $index) => {
          if (device.id == sessionDevice.id) {
            if (setActive) {
              devices.sessionDevices[$index].isConnected = true;
              device.isConnected = true;

              //check to see if we should set this device as the chosen one
              this.setThisDeviceSessionAsSelected($index);
            } else {
              //empty out the metaData and callbacks
              sessionDevice.callbacks = {};
              sessionDevice.metaData = {};
              device.isConnected = false;
              device.isMainDevice = false;
              devices.sessionDevices[$index].isConnected = false;
              if (devices.sessionDevices[$index].isSelected) {
                devices.sessionDevices[$index].isSelected = false;
                var done = false;
                while (!done) {
                  var dev = devices.sessionDevices.pop();
                  if (dev == sessionDevice) {
                    done = true;
                  } else {
                    devices.sessionDevices.unshift(dev);
                  }
                }

                //check to see if we need to set another device as the chosen one
                this.setAnotherDeviceSessionAsSelected();
              }
            }
          }
        });
      },

      /**
       * setThisDeviceSessionAsSelected - checks to see if there are any current other selected Devices,
       * if not, It sets the device specified by the index as active
       * @param  {int} index the position in the array of session devices to set as active
       * @return {null}  - operates directly on the device list
       */
      setThisDeviceSessionAsSelected: function(index) {
        //check to see if another device is currently selected
        var activeSetDevice = _.find(devices.sessionDevices, device => {
          return device.isConnected && device.isSelected;
        });

        //no other device is currently selected, set a new one as the selected device
        if (!activeSetDevice) {
          devices.sessionDevices[index].isSelected = true;
        }
      },

      /**
       * loops through our Session Devices and sets another one as selected.
       * This is used when a current selected Device is Disconnected, we will automatically promote a new connected device
       * @return {null} -operates directly on the device list
       */
      setAnotherDeviceSessionAsSelected: function() {
        var mainDeviceExists = false;
        for (var i = 0; i < devices.sessionDevices.length; i++) {
          if (devices.sessionDevices[i].isMainDevice) {
            mainDeviceExists = true;
          }
        }
        _.forEach(devices.sessionDevices, (device, $index) => {
          if (device.isConnected) {
            //we found another connected device, set it as the chosen one
            devices.sessionDevices[$index].isSelected = true;
            if (!mainDeviceExists) {
              device.isMainDevice = true;
            }
            //break outta the loop
            return false;
          }
        });
      },

      /**
       * disconnectPulse - disconnects a pulse device from BLE
       * @param  {[type]} deviceId [description]
       * @return {promise} --the result of the disconnect event
       */
      disconnectPulse: function(device, deferred, attemptReconnect = true) {
        if (!deferred) {
          deferred = $q.defer();
        }

        //don't do anything for non-mobile
        if (!window.cordova) {
          BLE.noCordova();
          deferred.resolve({
            message: "No Cordova",
            success: false
          });
          return deferred.promise;
        }

        if ($platform.isAndroid()) {
          var mac;
          //android disconnects btClassic
          if (device.metaData) {
            mac = device.metaData.macAddress;
          } else {
            var connectedPulses = this.getConnectedDevices();
            _.forEach(connectedPulses, connectedPulse => {
              if (connectedPulse.id == device.id) {
                mac = connectedPulse.metaData.macAddress;
              }
            });
          }
          if (mac) {
            btClassic.disconnect(mac);
          }
        }

        ble.disconnect(
          device.id,
          event => {
            ble.isConnected(
              device.id,
              () => {
                console.log(
                  "failed to disconnect device. Attempting to Disconnect again"
                );
                this.disconnectPulse(device, deferred, attemptReconnect);
              },
              () => {
                if (device.name == "Pulse Bootloader") {
                  $rootScope.$broadcast("scanBLE");
                  console.log(
                    "successfully disconnected from Pulse Bootloader"
                  );
                  deferred.resolve({
                    message: "Removed bootloader id " + device.id,
                    success: true
                  });
                  return deferred.promise;
                } else {
                  //success callback
                  console.log("Successfuly Disconnected* " + device.id);
                  this.removePulse(device);
                  this.setSessionDeviceToActiveOrInactive(device, false);
                  console.log("Successfuly Disconnected " + device.id);
                  //stuck in loop checks if we are stuck in connect/reconnect failure loop
                  if (
                    attemptReconnect &&
                    !updatingFirmware &&
                    !BLE.stuckInLoop()
                  ) {
                    console.log("starting re-scan");
                    this.scanAndConnectDevices();
                  }

                  deferred.resolve({
                    message: "Removed device id " + device.id,
                    success: true
                  });
                  return deferred.promise;
                }
              }
            );
          },
          error => {
            deferred.reject(error);
            return deferred.promise;
          }
        );
        return deferred.promise;
      },

      /**
       * removePulse - removes a pulse from the active device array
       * @param  {string} deviceId -the id of the pulse to remove
       * @return {null}
       */
      removePulse: function(device) {
        var changeSelected;
        _.forEach(this.devices, (connectedDevice, index) => {
          if (connectedDevice.id == device.id) {
            if (device.isSelected) {
              changeSelected = true;
            }
            device.isConnected = false;
            this.devices.splice(index, 1);
            //we found the one to remove, not jump out of the loop
            return false;
          }
        });
        if (changeSelected && this.devices.length) {
          //the removed Device was the selected one. Just change the selected pulse to the first one
          this.devices[0].isSelected = true;
        }
      },

      /**
       * function deselectPulse
       * @param  {boolean} index - the index of the Pulse array to modify
       * @return {null}
       */
      deselectPulse: function(positionInArray) {
        _.forEach(this.devices, (pulse, $index) => {
          //loop through and remove the device that is currently selected
          if (pulse.isSelected) {
            if ($index == positionInArray) {
              //this device is already selected, just get out
              return;
            }
            pulse.isSelected = false;
          }
        });
        //set the selected device
        this.devices[positionInArray].isSelected = true;
      },

      getDevicesFromStorage: function() {
        var deferred = $q.defer();
        $cordovaNativeStorage.getItem("devices").then(
          localStorageDevices => {
            deferred.resolve(localStorageDevices);
            //deferred.resolve([{'nickname': localStorageDevices['4661918C-24F2-43CC-424C-1C494CA70B94'].nickname}]);
          },
          error => {
            deferred.reject(error);
          }
        );
        return deferred.promise;
      },

      /**
       * fetchDeviceFromLocalStorage - retrieves localstorage info for a given device
       * @param  {object} device the device to look for
       * @return {boolean || object}   -either false if not found or the localStorage object if found
       */
      fetchDeviceFromLocalStorage: function(device) {
        var defer = $q.defer();
        $cordovaNativeStorage.getItem("devices").then(
          localStorageDevices => {
            if (!localStorageDevices) {
              defer.resolve({
                status: $config.localStorageStatus.NO_DEVICES,
                isPresent: false
              });
            } else {
              if (!localStorageDevices[device.id]) {
                defer.resolve({
                  status: $config.localStorageStatus.DEVICE_NOT_FOUND,
                  isPresent: false
                });
              } else {
                defer.resolve({
                  status: $config.localStorageStatus.DEVICE_FOUND,
                  isPresent: true,
                  device: localStorageDevices[device.id]
                });
              }
            }
          },
          error => {
            defer.resolve({
              status: $config.localStorageStatus.NO_DEVICES,
              isPresent: false
            });
          }
        );
        return defer.promise;
      },

      /**
       * buildLocalStorageDevice - sets some details from a device into local storage
       * @param  {object} device the device to set into localstorage
       * @return {object} - the device info that is stored in local storage
       */
      buildLocalStorageDevice: function(device) {
        var defer = $q.defer();
        $cordovaNativeStorage.getItem("devices").then(
          localStorageDevices => {
            if (!localStorageDevices) {
              //if this localstorage mapping doesnt exist yet, create it
              localStorageDevices = {};
            }
            var localStorageDeviceCount = _.size(localStorageDevices);

            if (!localStorageDevices[device.id]) {
              //device doesnt exist in localstorage yet, create it
              localStorageDevices[device.id] = {
                id: device.id,
                photos: device.photos || [],
                videos: device.videos || [],
                nickname: device.nickname || "My Pulse",
                timelapses: device.timelapses || []
              };

              $cordovaNativeStorage.setItem("devices", localStorageDevices);
            }
            defer.resolve(localStorageDevices[device.id]);
          },
          error => {
            var localStorageDevices = {};
            localStorageDevices[device.id] = {
              id: device.id,
              photos: device.photos || [],
              videos: device.videos || [],
              nickname: device.nickname || "My Pulse",
              timelapses: device.timelapses || []
            };
            $cordovaNativeStorage.setItem("devices", localStorageDevices);
            defer.resolve(localStorageDevices[device.id]);
          }
        );
        return defer.promise;
      },

      /**
       * getSelectedDevice -- helper function to get device that is currently selected
       * @return {object} the selected device
       */
      getSelectedDevice: function(filterList) {
        var selectedDevice, i, j;
        if (!filterList) {
          //this should fix our multipilse issue.
          if (devices.sessionDevices.length === 1) {
            if (devices.sessionDevices[0].isConnected) {
              devices.sessionDevices[0].isMainDevice = true;
              return devices.sessionDevices[0];
            }
          }
          var last_connected_device = null;
          for (i = 0; i < devices.sessionDevices.length; i++) {
            if (devices.sessionDevices[i].isConnected)
              last_connected_device = devices.sessionDevices[i];
            if (devices.sessionDevices[i].isMainDevice) {
              return devices.sessionDevices[i];
            }
          }
          if (last_connected_device !== null) {
            console.log("Forcing a session device!");
            last_connected_device.isMainDevice = true;
            return last_connected_device;
          }
        } else {
          for (i = 0; i < devices.sessionDevices.length; i++) {
            var device = devices.sessionDevices[i];
            if (device.isSelected) {
              var validDevice = true;
              for (j = 0; j < filterList.length; j++) {
                if (filterList[j] === device) {
                  validDevice = false;
                }
              }
              if (validDevice) {
                return device;
              }
            }
          }
        }
      },

      /**
       * renameDevice - sets a new device nickname in local storage
       * @param  {object} device   The device to attach
       * @param  {string} nickname the new nickname of the device
       * @return {null}
       */
      renameDevice: function(device, nickname, deepInject = false) {
        var deferred = $q.defer();
        $cordovaNativeStorage.getItem("devices").then(localStorageObj => {
          localStorageObj[device.id].nickname = nickname;
          //set the new nickname
          device.nickname = nickname;
          $cordovaNativeStorage.setItem("devices", localStorageObj).then(rr => {
            var connectedPulses = this.getConnectedDevices();
            _.forEach(connectedPulses, pulse => {
              if (pulse.id == device.id) {
                if (deepInject) {
                  pulse.localStorageInfo = device;
                  this.setDevice(pulse);
                  return false;
                } else {
                  device.nickname = nickname;
                  $cordovaNativeStorage
                    .getItem("devices")
                    .then(localDevices => {
                      pulse.localStorageInfo = localDevices[device.id];
                      this.setDevice(pulse);
                      return false;
                    });
                }
                //break out of the loop
                return false;
              }
            });
            deferred.resolve(JSON.parse(rr));
          });
        });

        return deferred.promise;
      },

      reSyncLocalStorage: function(device, nickname) {
        var deferred = $q.defer();
        $cordovaNativeStorage.getItem("devices").then(localStorageObj => {
          _.forEach(localStorageObj, localStorageDevice => {
            if (localStorageDevice.nickname == nickname) {
              if (localStorageDevice.id != device.id) {
                delete localStorageObj[localStorageDevice.id];
                localStorageObj[device.id] = device.localStorageInfo;
                $cordovaNativeStorage.setItem("devices", localStorageObj);
                console.log("local storage was out of sync. Resyncing");
              }
            }
          });
          deferred.resolve();
        });

        return deferred.promise;
      },

      startSubscription: function(device) {
        console.log("setting up subscriptions for device: " + device.id);
        ble.startNotification(
          device.id,
          $config.services.GATT_SERVICE_UUID_PULSE_SETTINGS_SERVICE,
          $config.characteristics.GATT_CHAR_UUID_APERTURE,
          device.callbacks.changeAperture,
          device.callbacks.subscriptionFailure
        );
        ble.startNotification(
          device.id,
          $config.services.GATT_SERVICE_UUID_PULSE_SETTINGS_SERVICE,
          $config.characteristics.GATT_CHAR_UUID_SHUTTER,
          device.callbacks.changeShutter,
          device.callbacks.subscriptionFailure
        );
        ble.startNotification(
          device.id,
          $config.services.GATT_SERVICE_UUID_PULSE_SETTINGS_SERVICE,
          $config.characteristics.GATT_CHAR_UUID_ISO,
          device.callbacks.changeIso,
          device.callbacks.subscriptionFailure
        );
        ble.startNotification(
          device.id,
          $config.services.GATT_SERVICE_UUID_PULSE_SETTINGS_SERVICE,
          $config.characteristics.GATT_CHAR_UUID_CAM_MODE,
          device.callbacks.changeMode,
          device.callbacks.subscriptionFailure
        );
        ble.startNotification(
          device.id,
          $config.services.GATT_SERVICE_UUID_PULSE_COMMS_SERVICE,
          $config.characteristics.GATT_CHAR_UUID_UART_RX,
          () => {
            console.log("hello");
          },
          device.callbacks.commsFailure
        );
        ble.startNotification(
          device.id,
          $config.services.GATT_SERVICE_UUID_PULSE_COMMS_SERVICE,
          $config.characteristics.GATT_CHAR_UUID_UART_TXACK,
          device.callbacks.pulseAck,
          device.callbacks.commsFailure
        );
        ble.startNotification(
          device.id,
          $config.services.GATT_SERVICE_UUID_BATT_SERVICE,
          $config.characteristics.GATT_CHAR_UUID_BATTERY_STATUS,
          device.callbacks.handleBattery,
          device.callbacks.subscriptionFailure
        );
        ble.startNotification(
          device.id,
          $config.services.GATT_SERVICE_UUID_DEV_INFO_SERVICE,
          $config.characteristics.GATT_CHAR_UUID_NICKNAME,
          device.callbacks.handleNickname,
          device.callbacks.subscriptionFailure
        );
        ble.startNotification(
          device.id,
          $config.services.GATT_SERVICE_UUID_STATUS_SERVICE,
          $config.characteristics.GATT_CHAR_UUID_STATUS_MODE,
          device.callbacks.handleStatusMode,
          device.callbacks.subscriptionFailure
        );
        ble.startNotification(
          device.id,
          $config.services.GATT_SERVICE_UUID_STATUS_SERVICE,
          $config.characteristics.GATT_CHAR_UUID_STATUS_STATE,
          device.callbacks.handleStatusState,
          device.callbacks.subscriptionFailure
        );

        this.postSubscribe(device);

        $rootScope.$on("refreshMode", (event, data) => {
          var timeNow = Date.now();
          // If it has been over 1 second since the last refresh then do it!
          if (timeNow - modeRefreshTime > 1000) {
            modeRefreshTime = timeNow;
            $timeout(() => {
              refreshMode(data.pulse);
            }, 1000);
          }
        });
      },

      handleNickname: function(rxData, device) {
        var data = new Uint8Array(rxData).subarray(0, 17);
        var nickname = decodeURIComponent(
          escape(String.fromCharCode.apply(null, data))
        );
        device.currentName = nickname;
        this.setDevice(device);
        this.reSyncLocalStorage(device, nickname).then(() => {
          this.renameDevice(device, nickname);
        });
      },

      harvestAnalytics: function(device) {
        if (analyticsToGet.length) {
          // Get next item to get
          $transmit.requestAnalytic(device, analyticsToGet[0]);

          // Clear old timeouts and set up a new one for the future
          if (harvestPromise) $timeout.cancel(harvestPromise);
          harvestPromise = $timeout(() => {
            this.harvestAnalytics(device);
          }, 3000);
        } else {
          $timeout.cancel(harvestPromise);
          console.log("Finished harvesting analytics. Chop Wood. Carry Water.");
          $transmit.requestUUID(device);
        }
      },

      metaGuardian: function(device) {
        console.log("The guardian is here to save your butt");
        getCommsData(device).then(rxData => {
          this.commsSuccess(rxData, device);
        });
      },

      pulseAck: function(rxData, device) {
        var data = new Uint8Array(rxData);
        if (data[0] == 0xff) {
          switch (txOperation) {
            case 0: {
              break;
            }
            case $config.communication.SET_PERSISTENT_DATA: {
              $rootScope.$broadcast("setPersistentData");
              txOperation = 0;
              break;
            }
            default: {
              txOperation = 0;
              console.log("Unknown operation. Pulse comms out of sync.");
            }
          }
        } else {
          switch (txOperation) {
            case 0: {
              console.log("ERROR: pulse comms out of sync");
              break;
            }
            case $config.communication.SET_PERSISTENT_DATA: {
              $transmit.setPersistentData(device, persistentData, data[0] + 1);
              break;
            }
            default: {
              console.log("Unknown operation. Pulse comms out of sync.");
            }
          }
        }
      },

      commsSuccess: function(rxData, device) {
        console.log("succ");
        var deferred = $q.defer();
        var data = new Uint8Array(rxData);
        var currentPacket = data[0];
        var expectedPackets = data[1];
        var opcode = data[2];

        if (!device.metaData || !device.metaData.rxBuffer) {
          this.initDevice(device);
        }
        switch (opcode) {
          case $config.communication.GET_META: {
            console.log("received metadata.");
            $timeout.cancel(metaPromise);

            metaPromise = $timeout(() => {
              this.metaGuardian(device);
            }, META_PAGE_TIMEOUT);

            var strippedData = data.subarray(3, data.length);
            handleMeta(strippedData, device); // Not correct, need to send the whole array

            if (currentPacket == expectedPackets - 1) {
              $timeout.cancel(metaPromise);

              parseMeta(device);
              prepareData(device);
              var isMetaGood = ensureMeta(device);
              if (isMetaGood || device.metaDataFetches > 5) {
                device.metaDataFetches = 0;
                device.cameraScanComplete = true;
                setDeviceToSessionDevices(device);
                if (device.metaData.newSession) {
                  this.harvestAnalytics(device);
                  handleSettings(device);
                } else {
                  handleSettings(device, false);
                }
                if (device.loadingMeta) {
                  if (!device.metaWait) {
                    $ionicLoading.hide();
                    device.loadingMeta = false;
                  } else {
                    device.metaWait = false;
                    $transmit.getMeta(device);
                  }
                }
              } else {
                device.metaDataFetches++;
                console.log(
                  "metadata was bad news bears. Re-requesting Metadata"
                );

                //clear out the metaData
                device = this.resetMetaData(device);
                $transmit.camStatus(device);
              }
            }
            break;
          }

          case $config.communication.GET_CAM_STATUS: {
            var connected = data[3];
            if (connected == 1) {
              device.metaData.cameraConnected = connected;
              console.log("Camera is connected!");
              setDeviceToSessionDevices(device);
              $timeout(() => {
                if (!device.metaData.requestingMeta) {
                  $transmit.getMeta(device);
                  device.metaData.requestingMeta = true;
                  $timeout(() => {
                    device.metaData.requestingMeta = false;
                  }, 1000);
                } else {
                  console.log(
                    "already requested meta. Not going to request again"
                  );
                }
              }, 1000);
            } else {
              //clear out the metaData

              if (device.metaData.cameraConnected && connected === 0) {
                // had a disconnecion
                // Start scan process
                device.metaData.newSession = true;
                device.cameraScanComplete = false;
                device = this.resetMetaData(device);
                this.checkForCameraConnection(device);
              }

              device = this.resetMetaData(device);

              //initiate a rescan for camera if we arent already scanning
              if (device.cameraScanComplete) {
                setDeviceToSessionDevices(device);
              }

              device.metaData.cameraConnected = connected;
            }
            break;
          }

          case $config.communication.GET_THUMB_READY: {
            console.log(
              "received thumbnail ready notification. Attempting to read out over BTC"
            );
            setDeviceToSessionDevices(device);
            device.waitingForThumb = false;
            $rootScope.$broadcast("receivedThumbnailMeta");

            //read from BT CLASSIC then store to local storage, then render
            btClassic.read(device.metaData.macAddress).then(data => {
              if (data && data.length) {
                console.log(
                  "Read from BTClassic. Data length is " + data.length
                );
                convertThumb(data, device);
              } else {
                $rootScope.$broadcast("thumbnailUploadFailed");
                console.log(
                  "Attempt to read from BT Classic Failed. Data was empty"
                );
              }
            });

            break;
          }

          case $config.communication.GET_TL_START: {
            console.log("metadata signalled to start Timelapse counter");
            $rootScope.$broadcast("startTimelapseUi", device);

            break;
          }
          case $config.communication.GET_FW_VERSION: {
            var fwMajor = data[3];
            var fwMinor = data[4];
            console.log(
              "received firmware Version: " + fwMajor + "." + fwMinor
            );
            if (fwMinor < 10) {
              fwMinor = "0" + fwMinor;
            }
            device.firmwareVersion =
              fwMajor.toString() + "." + fwMinor.toString();
            if (parseFloat(device.firmwareVersion) < 1.1) {
              $views.permissableMode = true;
            }
            $cordovaNativeStorage.setItem(
              "firmwareVersion",
              device.firmwareVersion
            );
            this.setDevice(device);
            break;
          }

          case $config.communication.GET_FW_TYPE: {
            console.log("Received firmware type...");
            switch (data[3]) {
              case $config.firmwareTypes.DUAL: {
                console.log("Firmware type is DUAL");
                if (!$platform.isAndroid()) {
                  device.firmwareType = "BAD_TIME";
                } else {
                  device.firmwareType = $config.firmwareTypes.DUAL;
                }
                $cordovaNativeStorage.setItem("firmwareType", "DUAL");
                this.setDevice(device);

                break;
              }
              case $config.firmwareTypes.IOS: {
                console.log("Firmware type is IOS");
                if ($platform.isAndroid()) {
                  device.firmwareType = "BAD_TIME";
                } else {
                  device.firmwareType = $config.firmwareTypes.IOS;
                }
                $cordovaNativeStorage.setItem("firmwareType", "IOS");
                this.setDevice(device);

                break;
              }
              case $config.firmwareTypes.DROID: {
                console.log("Firmware type is DROID");
                if (!$platform.isAndroid()) {
                  device.firmwareType = "BAD_TIME";
                } else {
                  device.firmwareType = $config.firmwareTypes.DROID;
                }
                $cordovaNativeStorage.setItem("firmwareType", "ANDROID");
                this.setDevice(device);

                break;
              }
            }
            break;
          }

          case $config.communication.REQUEST_BTC_CONNECT: {
            console.log("bt classic connect returned. status: " + data[3]);
            if (data[3] == 1) {
              //pulse says we are connected. Let's make sure
              var os = $platform.getDeviceVersion();
              if (os === "11.2.5") {
                console.log("Using OS 11.2.5, fuuuuuck");

                device.btClassic.enabled = false;
                device.btClassic.connected = false;
              } else if (device.firmwareType != "BAD_TIME") {
                $timeout(() => {
                  console.log("inside timeout ");
                  btClassic.isConnected(device.metaData.macAddress).then(
                    response => {
                      device.btClassic.enabled = true;
                      device.btClassic.connected = true;
                      this.setDevice(device);
                      console.log("we are connected, everything is cool ");
                    },
                    error => {
                      console.log("we are are not connected, try to connect");
                      btClassic
                        .connect(device.metaData.macAddress, device)
                        .then(
                          result => {
                            device.btClassic.enabled = true;
                            device.btClassic.connected = true;
                            this.setDevice(device);
                            console.log("good conn ");
                          },
                          error => {
                            console.log(error);
                            device.btClassic.enabled = false;
                            device.btClassic.connected = false;
                            console.log("bad conn ");
                          }
                        );
                    }
                  );
                }, 3000);
              }
            }
            if (data[3] === 0) {
              //handle disconnect event
              device.btClassic.enabled = false;
              device.btClassic.connected = false;
            }
            break;
          }

          case $config.communication.GET_CLASSIC_MAC: {
            var macData = data.subarray(3, 9);
            parseMacAddress(macData, device, macData.length);
            console.log("trying to connect over btClassic to MAC : ");

            //ensure the localStorageInfo is up to date

            this.fetchDeviceFromLocalStorage(device).then(localStorageInfo => {
              //set the nickname
              device.localStorageInfo.nickname =
                localStorageInfo.device.nickname;

              var os = $platform.getDeviceVersion();
              if (os === "11.2.5") {
                console.log("Using OS 11.2.5, fuuuuuck");

                device.btClassic.enabled = false;
                device.btClassic.connected = false;
              } else if (device.firmwareType != "BAD_TIME") {
                btClassic.isConnected(device.metaData.macAddress).then(
                  result => {
                    //we are already connected, update the device already
                    device.btClassic.enabled = true;
                    device.btClassic.connected = true;
                  },
                  error => {
                    //we aren't connected. Try to connect
                    btClassic.connect(device.metaData.macAddress, device).then(
                      result => {
                        if ($platform.isAndroid()) {
                          console.log("android phone. Disconnecting now");
                          btClassic
                            .disconnect(device.metaData.macAddress)
                            .then(result2 => {
                              btClassic
                                .connect(device.metaData.macAddress, device)
                                .then(result3 => {
                                  console.log(
                                    "android disconnected then reconnected"
                                  );
                                  device.btClassic.enabled = true;
                                  device.btClassic.connected = true;
                                  this.setDevice(device);
                                });
                            });
                        } else {
                          console.log("successfully connected to btClassic");
                          device.btClassic.enabled = true;
                          device.btClassic.connected = true;
                          this.setDevice(device);
                        }
                      },
                      error => {
                        console.log("failed to connect to btClassic");

                        device.btClassic.enabled = false;
                        device.btClassic.connected = false;
                      }
                    );
                  }
                );
              }
            });

            break;
          }

          case $config.communication.GET_DEVICE_ANALYTICS: {
            var adat = data.subarray(4, 7);
            var index = 0;
            var analyticData = adat[index++];
            analyticData |= adat[index++] << 8;
            analyticData |= adat[index++] << 16;
            analyticData |= adat[index++] << 24;

            switch (data[3]) {
              case $config.analyticTypes.PHOTOS: {
                console.log("Got Pulse photo count: ", analyticData);
                device.photos = analyticData;
                removeA(analyticsToGet, $config.analyticTypes.PHOTOS);
                this.harvestAnalytics(device);
                break;
              }
              case $config.analyticTypes.VIDEOS: {
                console.log("Got Pulse video count: ", analyticData);
                device.videos = analyticData;
                removeA(analyticsToGet, $config.analyticTypes.VIDEOS);
                this.harvestAnalytics(device);
                break;
              }
              case $config.analyticTypes.TIMELAPSES: {
                console.log("Got Pulse timelapse count: ", analyticData);
                device.timelapses = analyticData;
                removeA(analyticsToGet, $config.analyticTypes.TIMELAPSES);
                this.harvestAnalytics(device);
                break;
              }
              case $config.analyticTypes.THUMBNAILS: {
                console.log("Got Pulse thumbnail count: ", analyticData);
                device.thumbnails = analyticData;
                removeA(analyticsToGet, $config.analyticTypes.THUMBNAILS);
                this.harvestAnalytics(device);
                break;
              }
              case $config.analyticTypes.SESSIONS: {
                console.log("Got Pulse session count: ", analyticData);
                device.sessions = analyticData;
                removeA(analyticsToGet, $config.analyticTypes.SESSIONS);
                this.harvestAnalytics(device);
                break;
              }
              case $config.analyticTypes.UPTIME: {
                console.log("Got Pulse uptime: ", analyticData);
                device.uptime = analyticData;
                removeA(analyticsToGet, $config.analyticTypes.UPTIME);
                this.harvestAnalytics(device);
                break;
              }
              case $config.analyticTypes.TL_COMPLETE: {
                console.log("Got Pulse uptime: ", analyticData);
                device.timelapsesComplete = analyticData;
                removeA(analyticsToGet, $config.analyticTypes.TL_COMPLETE);
                this.harvestAnalytics(device);
                break;
              }
              case $config.analyticTypes.LONG_EXPOSURE: {
                console.log("Got Pulse uptime: ", analyticData);
                device.longExposures = analyticData;
                removeA(analyticsToGet, $config.analyticTypes.LONG_EXPOSURE);
                this.harvestAnalytics(device);
                break;
              }
            }
            break;
          }

          case $config.communication.GET_PULSE_UUID: {
            device.uuid = data.subarray(3, 20);
            device.uuid = $views.byteArrayToHexString(device.uuid);

            console.log("Got Pulse UUID: " + device.uuid);
            $transmit.reportAnalytics(device);
            resetATG();
            enableCameraMenus(device);
            break;
          }
          case $config.communication.GET_PERSISTENT_DATA: {
            console.log(
              "Got PD: page " + currentPacket + " of " + (expectedPackets - 1)
            );

            var temp;
            if (!ignorePD) {
              if (currentPacket === 0) {
                persistentData = []; // Clear data on first packet
              }

              temp = data.subarray(3, data.length - 3);
              // console.dir(temp);
              persistentData.push.apply(persistentData, temp);
            } else {
              if (currentPacket === 0) {
                backupPD = [];
              }
              temp = data.subarray(3, data.length - 3);
              // console.dir(temp);
              backupPD.push.apply(backupPD, temp);
            }

            if (currentPacket == expectedPackets - 1) {
              console.log("Finished buffering Persistent Data");
              $cordovaNativeStorage
                .setItem("persistentData", persistentData)
                .then(() => {
                  $rootScope.$broadcast("gotPersistentData");
                });
            }
            break;
          }
          default: {
            console.log("Unknown comms: " + opcode);
          }
        }

        if (currentPacket == expectedPackets - 1) {
          currentPacket = 0xff;
        }

        $transmit.acknowledgePacket(device, currentPacket);
      },

      changeAperture: function(buffer, device) {
        console.log("changing apertureValue");
        var apertureValue;
        var data = new Uint8Array(buffer);
        var value =
          data[0] | (data[1] << 8) | (data[2] << 16) | (data[3] << 24);
        console.log("aperture value is: " + value);
        if (device.metaData.cameraType == $config.cameraSettings.make.CANON) {
          apertureValue = $config.cameraSettings.canonAperture[value];
        } else {
          apertureValue = $config.cameraSettings.nikonAperture[value];
        }
        if (!device.metaData.camSettings.apertureOptions.length) {
          device = setAperture(device);
        }
        _.forEach(
          device.metaData.camSettings.apertureOptions,
          (option, $index) => {
            if (apertureValue == option.value) {
              option.selected = true;
              device.metaData.camSettings.activeApertureIndex = $index;
              var data = {
                apertureIndex: $index
              };
              var selectedDevice = this.getSelectedDevice();

              if (device.id == selectedDevice.id && data) {
                //only update UI if we the camera is the selected one
                $rootScope.$broadcast("apertureUpdated", data);
              }
            }
          }
        );
        setDeviceToSessionDevices(device);
        $rootScope.$broadcast("refreshMode", {
          pulse: device
        });
      },

      changeMode: function(buffer, device) {
        modeRefreshTime = Date.now();
        var data = new Uint8Array(buffer);
        var modeValue =
          data[$config.offsets.MODE] |
          (data[$config.offsets.MODE + 1] << 8) |
          (data[$config.offsets.MODE + 2] << 16) |
          (data[$config.offsets.MODE + 3] << 24);
        var camBattery = data[$config.offsets.BATT];
        var camCapacity =
          data[$config.offsets.CAP] | (data[$config.offsets.CAP + 1] << 8);
        var whiteBalance =
          data[$config.offsets.WB] | (data[$config.offsets.WB + 1] << 8);
        var camMode;
        if (device.metaData.cameraType == $config.cameraSettings.make.CANON) {
          camMode = $config.cameraMode.CANON[modeValue];
          console.log(
            "Canon Mode updated to " +
              $config.cameraMode.CANON[modeValue] +
              " : " +
              modeValue
          );
        } else if (
          device.metaData.cameraType == $config.cameraSettings.make.NIKON
        ) {
          camMode = $config.cameraMode.NIKON[modeValue];
          console.log(
            "Nikon Mode updated to " +
              $config.cameraMode.NIKON[modeValue] +
              " : " +
              modeValue
          );
        } else {
          camMode = "UNDEFINED";
          console.log("Mode is still undefined");
        }

        if (
          device.metaData.cameraMode &&
          device.metaData.cameraMode.length &&
          device.metaData.cameraMode != "UNDEFINED" &&
          device.metaData.cameraMode != camMode
        ) {
          if (!device.metaData.newSession && !device.loadingMeta) {
            console.log("requesting metadata from mode change");
            device = this.resetMetaData(device, true, false);
            $transmit.getMeta(device);
            $ionicLoading.show({
              templateUrl: "templates/partials/loading-metadata.html",
              duration: 3000
            });
            device.shouldBroadcast = false;
            device.loadingMeta = true;
            $timeout(() => {
              device.loadingMeta = false;
            }, 3000);
          } else {
            device.metaWait = true;
          }
        }
        device.metaData.cameraMode = camMode;

        var selectedDevice = this.getSelectedDevice();
        if (device.id == selectedDevice.id) {
          selectedDevice.metaData.cameraMode = device.metaData.cameraMode;
          setDeviceToSessionDevices(selectedDevice);
        }
      },

      changeShutter: function(buffer, device) {
        console.log("changing shutter value");
        var shutterValue;
        var data = new Uint8Array(buffer);
        var value =
          data[0] | (data[1] << 8) | (data[2] << 16) | (data[3] << 24);
        console.log("shutter value is: " + value);
        if (device.metaData.cameraType == $config.cameraSettings.make.CANON) {
          shutterValue = $config.cameraSettings.canonShutter[value];
        } else {
          if (
            (value == -1 || value == 65535) &&
            $views.doesModelSupport(device, "bulb")
          ) {
            //it's bulb
            shutterValue = $config.cameraSettings.nikonShutter[0xffffffff];
          } else {
            shutterValue = $config.cameraSettings.nikonShutter[value];
          }
        }
        if (!device.metaData.camSettings.shutterOptions.length) {
          device = setShutter(device);
          $rootScope.$broadcast("shutterArray");
        }

        var selectedDevice = this.getSelectedDevice();
        var shutterData = this.findShutterIndex(
          device,
          shutterValue,
          device.metaData.camSettings.shutterOptions
        );

        if (device.id == selectedDevice.id && shutterData) {
          //only update UI if we the camera is the selected one
          $rootScope.$broadcast("shutterUpdated", shutterData);
        }

        $rootScope.$broadcast("refreshMode", {
          pulse: device
        });
        setDeviceToSessionDevices(device);
      },

      findShutterIndex: function(
        device,
        shutterValue,
        shutterOptions,
        update = true
      ) {
        var data;
        _.forEach(shutterOptions, (option, $index) => {
          if (shutterValue == option.value) {
            option.selected = true;
            if (update) {
              device.metaData.camSettings.activeShutterIndex = $index;
            }
            data = {
              shutterIndex: $index
            };
            //break out of the loop cuz we found a match
            return false;
          }
        });

        return data;
      },

      changeIso: function(buffer, device) {
        console.log("changing Iso value");
        var data = new Uint8Array(buffer);
        var isoValue;
        var value =
          data[0] | (data[1] << 8) | (data[2] << 16) | (data[3] << 24);
        console.log("iso value is: " + value);
        if (device.metaData.cameraType == $config.cameraSettings.make.CANON) {
          isoValue = $config.cameraSettings.canonIso[value];
        } else {
          isoValue = $config.cameraSettings.nikonIso[value];
        }
        if (!device.metaData.camSettings.isoOptions.length) {
          device = setIso(device);
        }
        var isoData = this.findIsoIndex(
          device,
          isoValue,
          device.metaData.camSettings.isoOptions
        );
        var selectedDevice = this.getSelectedDevice();

        if (device.id == selectedDevice.id && isoData) {
          //only update UI if we the camera is the selected one
          $rootScope.$broadcast("isoUpdated", isoData);
        }

        setDeviceToSessionDevices(device);
        $rootScope.$broadcast("refreshMode", {
          pulse: device
        });
      },

      findIsoIndex: function(device, isoValue, isoOptions) {
        var data;
        _.forEach(isoOptions, (option, $index) => {
          if (isoValue == option.value) {
            option.selected = true;
            device.metaData.camSettings.activeIsoIndex = $index;
            data = {
              isoIndex: $index
            };

            //break out of the loop cuz we found a match
            return false;
          }
        });
        return data;
      },

      setDevice: function(device) {
        setDeviceToSessionDevices(device);
      },

      thumb: function(data, device) {
        convertThumb(data, device);
      },

      handleBattery: function(rxData, device) {
        var data = new Uint8Array(rxData);
        var batteryData = data[0];
        device.metaData.battery = batteryData;
        this.setDevice(device);
      },

      handleStatusMode: function(rxData, device) {
        var data = new Uint8Array(rxData);
        var statusMode = data[0];
        if (statusMode == $config.statusMode.CHARGING) {
          $timeout(() => {
            device.metaData.statusMode = statusMode;
            this.setDevice(device);
          }, 5000);
        } else {
          device.metaData.statusMode = statusMode;
          this.setDevice(device);
        }
        return statusMode;
      },

      handleStatusState: function(rxData, device) {
        var data = new Uint8Array(rxData);
        var statusState = data[0] | (data[1] << 8);
        device.metaData.statusState = statusState;
        this.setDevice(device);
        if (device.metaData.statusMode == $config.statusMode.TIMELAPSE) {
          var tlData = {
            pictureCount: device.metaData.statusState,
            device: device
          };
          $rootScope.$broadcast("timelapseTaken", tlData);
        }

        if (device.metaData.statusMode == $config.statusMode.CAPTURE) {
          if (statusState == $config.statusState.COMPLETE) {
            $rootScope.$broadcast("pictureFinished");
          }
        }
        return statusState;
      }
    };
  });
})();
