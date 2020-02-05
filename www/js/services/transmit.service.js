"use strict";

(function() {
  "use strict";

  pulse.services.factory("$transmit", function(
    $q,
    $config,
    BLE,
    $http,
    $views,
    $platform
  ) {
    var MTU = 20;
    var PULSE_LAUNCH_UNIX_TIME = 1473509532000;

    return {
      init: function init() {
        var devicePlatform = $platform.getDevicePlatform();
        var deviceOS = $views.detectVersion($platform.getDeviceVersion());

        if (devicePlatform == "Android") {
          MTU = 20;
        } else {
          if (deviceOS > 9) {
            //ios10 MTU
            MTU = 156;
          } else {
            MTU = 155;
          }
        }
      },

      setMTU: function setMTU(newMTU) {
        MTU = newMTU;
      },

      setShutter: function setShutter(device, data) {
        var deferred = $q.defer();
        if (!device) {
          console.log("setShutter: No connected Device");
          deferred.reject("no device is connected");
        } else {
          var setShutter = [0x00, 0x01, 0x01];
          for (var i = 0; i < data.length; i++) {
            setShutter.push(data[i]);
          }
          var buff = new Uint8Array(setShutter);
          BLE.write(
            device.id,
            $config.services.GATT_SERVICE_UUID_PULSE_COMMS_SERVICE,
            $config.characteristics.GATT_CHAR_UUID_UART_TX,
            buff.buffer,
            function(response) {
              deferred.resolve(response);
            },
            function(error) {
              console.log(error);
              deferred.reject(error);
            }
          );
        }

        return deferred.promise;
      },

      setAperture: function setAperture(device, data) {
        var deferred = $q.defer();

        if (!device) {
          console.log("setAperture: No connected Device");
          deferred.reject("no device is connected");
        } else {
          var setAperture = [0x00, 0x01, 0x02];
          for (var i = 0; i < data.length; i++) {
            setAperture.push(data[i]);
          }
          var buff = new Uint8Array(setAperture);
          BLE.write(
            device.id,
            $config.services.GATT_SERVICE_UUID_PULSE_COMMS_SERVICE,
            $config.characteristics.GATT_CHAR_UUID_UART_TX,
            buff.buffer,
            function(response) {
              deferred.resolve(response);
            },
            function(error) {
              console.log(error);
              deferred.reject(error);
            }
          );
        }

        return deferred.promise;
      },

      setIso: function setIso(device, data) {
        var deferred = $q.defer();

        if (!device) {
          console.log("setIso: No connected Device");
          deferred.reject("no device is connected");
        } else {
          var setIso = [0x00, 0x01, 0x03];
          for (var i = 0; i < data.length; i++) {
            setIso.push(data[i]);
          }
          var buff = new Uint8Array(setIso);
          BLE.write(
            device.id,
            $config.services.GATT_SERVICE_UUID_PULSE_COMMS_SERVICE,
            $config.characteristics.GATT_CHAR_UUID_UART_TX,
            buff.buffer,
            function(response) {
              deferred.resolve(response);
            },
            function(error) {
              console.log(error);
              deferred.reject(error);
            }
          );
        }

        return deferred.promise;
      },

      capture: function capture(device) {
        var fastPhoto =
          arguments.length > 1 && arguments[1] !== undefined
            ? arguments[1]
            : true;

        var deferred = $q.defer();

        if (!device) {
          console.log("capture: No connected Device");
          deferred.reject("no device is connected");
        } else {
          var photoMode;
          if (fastPhoto) {
            photoMode = $config.communication.ACTION_PHOTO_FAST;
            console.log("capture: fast photo");
          } else {
            photoMode = $config.communication.ACTION_PHOTO_CAPTURE;
            console.log("capture: ack photo");
          }
          var captureData = [
            0x00,
            0x01,
            $config.communication.SET_ACTION,
            photoMode
          ];
          var buff = new Uint8Array(captureData);
          console.log("buff : " + JSON.stringify(buff));
          BLE.write(
            device.id,
            $config.services.GATT_SERVICE_UUID_PULSE_COMMS_SERVICE,
            $config.characteristics.GATT_CHAR_UUID_UART_TX,
            buff.buffer,
            function(response) {
              console.log("capture write response : " + response);
              deferred.resolve(response);
            },
            function(error) {
              console.log("capture write error: ");
              console.log(error);
              deferred.reject(error);
            }
          );
        }

        return deferred.promise;
      },

      burstCanon: function burstCanon(device) {
        var deferred = $q.defer();

        if (!device) {
          console.log("burst: No connected Device");
          deferred.reject("no device is connected");
        } else {
          this.startBulb(device);
          deferred.resolve();
        }

        return deferred.promise;
      },

      endBurstCanon: function endBurstCanon(device) {
        var deferred = $q.defer();

        if (!device) {
          console.log("burst: No connected Device");
          deferred.reject("no device is connected");
        } else {
          this.endBulb(device);
          deferred.resolve();
        }

        return deferred.promise;
      },

      burstNikon: function burstNikon(device) {
        var deferred = $q.defer();

        if (!device) {
          console.log("burst: No connected Device");
          deferred.reject("no device is connected");
        } else {
          var burstData = [
            0x00,
            0x01,
            $config.communication.SET_ACTION,
            $config.communication.ACTION_PHOTO_BURST,
            0x5
          ];
          var buff = new Uint8Array(burstData);
          BLE.write(
            device.id,
            $config.services.GATT_SERVICE_UUID_PULSE_COMMS_SERVICE,
            $config.characteristics.GATT_CHAR_UUID_UART_TX,
            buff.buffer,
            function(response) {
              deferred.resolve(response);
            },
            function(error) {
              deferred.reject(error);
            }
          );
        }

        return deferred.promise;
      },

      setLedBrightness: function setLedBrightness(device, level) {
        var deferred = $q.defer();
        if (!device) {
          console.log("setLedBrightness: No connected Device");
          deferred.reject("no device is connected");
        } else {
          var ledData = [0x00, 0x01, $config.communication.SET_LED_DUTY, level];
          var buff = new Uint8Array(ledData);
          BLE.write(
            device.id,
            $config.services.GATT_SERVICE_UUID_PULSE_COMMS_SERVICE,
            $config.characteristics.GATT_CHAR_UUID_UART_TX,
            buff.buffer,
            function(response) {
              deferred.resolve(response);
            },
            function(error) {
              console.log(error);
              deferred.reject(error);
            }
          );
        }

        return deferred.promise;
      },

      enableMenus: function enableMenus(device) {
        var deferred = $q.defer();
        if (!device) {
          console.log("enableMenu: No connected Device");
          deferred.reject("no device is connected");
        } else {
          var menuData = [0x00, 0x01, $config.communication.ENABLE_MENUS];
          var buff = new Uint8Array(menuData);
          BLE.write(
            device.id,
            $config.services.GATT_SERVICE_UUID_PULSE_COMMS_SERVICE,
            $config.characteristics.GATT_CHAR_UUID_UART_TX,
            buff.buffer,
            function(response) {
              deferred.resolve(response);
            },
            function(error) {
              console.log(error);
              deferred.reject(error);
            }
          );
        }

        return deferred.promise;
      },

      startVideo: function startVideo(device) {
        var deferred = $q.defer();

        if (!device) {
          console.log("startVideo: No connected Device");
          deferred.reject("no device is connected");
        } else {
          var videoData = [
            0x00,
            0x01,
            $config.communication.SET_ACTION,
            $config.communication.ACTION_VIDEO_START
          ];
          var buff = new Uint8Array(videoData);
          BLE.write(
            device.id,
            $config.services.GATT_SERVICE_UUID_PULSE_COMMS_SERVICE,
            $config.characteristics.GATT_CHAR_UUID_UART_TX,
            buff.buffer,
            function(response) {
              deferred.resolve(response);
            },
            function(error) {
              console.log(error);
              deferred.reject(error);
            }
          );
        }

        return deferred.promise;
      },

      stopVideo: function stopVideo(device) {
        var deferred = $q.defer();

        if (!device) {
          console.log("stopVideo: No connected Device");
          deferred.reject("no device is connected");
        } else {
          var videoData = [
            0x00,
            0x01,
            $config.communication.SET_ACTION,
            $config.communication.ACTION_VIDEO_STOP
          ];
          var buff = new Uint8Array(videoData);
          BLE.write(
            device.id,
            $config.services.GATT_SERVICE_UUID_PULSE_COMMS_SERVICE,
            $config.characteristics.GATT_CHAR_UUID_UART_TX,
            buff.buffer,
            function(response) {
              deferred.resolve(response);
            },
            function(error) {
              console.log(error);
              deferred.reject(error);
            }
          );
        }

        return deferred.promise;
      },

      camStatus: function camStatus(device) {
        var deferred = $q.defer();

        if (!device) {
          console.log("camStatus: No connected Device");
          deferred.reject("no device is connected");
        } else {
          var statusData = [0x00, 0x01, $config.communication.GET_CAM_STATUS];
          var buff = new Uint8Array(statusData);
          BLE.write(
            device.id,
            $config.services.GATT_SERVICE_UUID_PULSE_COMMS_SERVICE,
            $config.characteristics.GATT_CHAR_UUID_UART_TX,
            buff.buffer,
            function(response) {
              deferred.resolve(response);
            },
            function(error) {
              console.log(error);
              deferred.reject(error);
            }
          );
        }

        return deferred.promise;
      },

      getMeta: function getMeta(pulse) {
        var deferred = $q.defer();
        var devicePlatform = device.platform;
        var deviceOS = $views.detectVersion(device.version);

        console.log("device platform is " + device.platform);

        if (!pulse) {
          console.log("getMeta: No connected Device");
          deferred.reject("no device is connected");
        } else {
          console.log("requesting meta data");
          var metaData = [0x00, 0x01, $config.communication.GET_META, MTU];
          console.log(metaData);
          var buff = new Uint8Array(metaData);
          BLE.write(
            pulse.id,
            $config.services.GATT_SERVICE_UUID_PULSE_COMMS_SERVICE,
            $config.characteristics.GATT_CHAR_UUID_UART_TX,
            buff.buffer,
            function(response) {
              deferred.resolve(response);
            },
            function(error) {
              console.log(error);
              deferred.reject(error);
            }
          );
        }

        return deferred.promise;
      },

      requestThumb: function requestThumb(device) {
        var thumbIndex =
          arguments.length > 1 && arguments[1] !== undefined
            ? arguments[1]
            : 0x1;

        var deferred = $q.defer();
        if (!device) {
          console.log("requestThumb: No connected Device");
          deferred.reject("no device is connected");
        } else {
          console.log("Requesting thumbnail");
          var thumbData = [
            0x00,
            0x01,
            $config.communication.GET_THUMB_READY,
            thumbIndex & 0xff,
            (thumbIndex >> 8) & 0xff
          ];
          var buff = new Uint8Array(thumbData);
          BLE.write(
            device.id,
            $config.services.GATT_SERVICE_UUID_PULSE_COMMS_SERVICE,
            $config.characteristics.GATT_CHAR_UUID_UART_TX,
            buff.buffer,
            function(response) {
              console.log("successfully requested thumb");
            },
            function(error) {
              console.log("failed in requesting thumb");
            }
          );
          deferred.resolve();
        }
        return deferred.promise;
      },

      cancelThumb: function cancelThumb(device) {
        var deferred = $q.defer();
        if (!device) {
          console.log("cancelThumb: No connected Device");
          deferred.reject("no device is connected");
        } else {
          console.log("picture taken. canceling thumbnail");
          var cancelData = [0x00, 0x01, $config.communication.CANCEL_THUMB];
          var buff = new Uint8Array(cancelData);
          BLE.write(
            device.id,
            $config.services.GATT_SERVICE_UUID_PULSE_COMMS_SERVICE,
            $config.characteristics.GATT_CHAR_UUID_UART_TX,
            buff.buffer,
            function(response) {
              console.log("successfully canceled thumb");
            },
            function(error) {
              console.log("failed in canceling thumb");
            }
          );
          deferred.resolve();
        }
        return deferred.promise;
      },

      acknowledgePacket: function acknowledgePacket(device, packet) {
        var deferred = $q.defer();
        var packetData = [packet];
        var buff = new Uint8Array(packetData);

        if (!device) {
          console.log("acknowledgePacket: No connected Device");
          deferred.reject("no device is connected");
        } else {
          BLE.write(
            device.id,
            $config.services.GATT_SERVICE_UUID_PULSE_COMMS_SERVICE,
            $config.characteristics.GATT_CHAR_UUID_UART_RXACK,
            buff.buffer,
            function(response) {
              deferred.resolve(response);
            },
            function(error) {
              console.log(error);
              deferred.reject(error);
            }
          );
        }
      },

      timelapse: function timelapse(
        device,
        interval,
        numPhotos,
        timeDelayData,
        brampingData
      ) {
        var isInfinite =
          arguments.length > 5 && arguments[5] !== undefined
            ? arguments[5]
            : false;

        var deferred = $q.defer();

        if (!device) {
          console.log("timelapse: no connected device");
          deferred.reject("no device is connected");
        } else {
          console.log("sending TL data");
          var setShutterTime = 100;

          var totalInterval = interval * 4,
            //grab the total quarter seconds
            intervalLSB = totalInterval % $config.maxPacketValue,
            intervalMSB =
              Math.floor(totalInterval / $config.maxPacketValue) %
              $config.maxPacketValue,
            intervalMMSB = Math.floor(
              totalInterval / $config.maxPacketValue / $config.maxPacketValue
            );

          var numPhotosLSB = numPhotos % $config.maxPacketValue,
            numPhotosMSB = Math.floor(numPhotos / $config.maxPacketValue); //get the MSB

          var durationFlag = 1;
          if (isInfinite) {
            durationFlag = 3;
          }

          //--- BRAMPING SETTINGS ---

          var isBramping = brampingData ? 4 : 0;
          var expPower = brampingData ? brampingData.expPower : 120;
          var brampDurations = brampingData
            ? brampingData.totalTimeInMinutes
            : 120;
          var brampFrontDelay = brampingData
            ? brampingData.frontDelayTime
            : 120;
          var shutterChange = brampingData ? brampingData.deltaShutter : 120;

          // --------
          // --- TIME DELAY DATA ---
          //
          var timeDelayLSB = timeDelayData
            ? timeDelayData.seconds % $config.maxPacketValue
            : 0;
          var timeDelayMSB = timeDelayData
            ? Math.floor(timeDelayData.seconds / $config.maxPacketValue) %
              $config.maxPacketValue
            : 0;
          var timeDelayMMSB = timeDelayData
            ? Math.floor(
                timeDelayData.seconds /
                  ($config.maxPacketValue * $config.maxPacketValue)
              ) % $config.maxPacketValue
            : 0;

          // ---

          var tlData = [
            0,
            1,
            $config.communication.SET_TL_DATA,
            253,
            1,
            60,
            80,
            100,
            50,
            45,
            0,
            durationFlag,
            0,
            intervalLSB,
            intervalMSB,
            intervalMMSB,
            numPhotosLSB,
            numPhotosMSB,
            timeDelayLSB,
            timeDelayMSB,
            timeDelayMMSB,
            100,
            0,
            0,
            40,
            isBramping,
            expPower,
            brampDurations,
            brampFrontDelay,
            shutterChange,
            0,
            120,
            120,
            120,
            120,
            120,
            120,
            120,
            120,
            120,
            120,
            120,
            120,
            0,
            120,
            120,
            120,
            120,
            120,
            120,
            120,
            120,
            120,
            120,
            120,
            120,
            0,
            120,
            120,
            120,
            120,
            120,
            120,
            120,
            120,
            120,
            120,
            120,
            120,
            61,
            254
          ];

          var check = 0;
          for (var i = 3; i < tlData.length - 2; i++) {
            check += tlData[i];
          }

          check %= 256;
          check %= $config.maxPacketValue;
          tlData[tlData.length - 2] = check;

          var buff = new Uint8Array(tlData);
          BLE.write(
            device.id,
            $config.services.GATT_SERVICE_UUID_PULSE_COMMS_SERVICE,
            $config.characteristics.GATT_CHAR_UUID_UART_TX,
            buff.buffer,
            function(response) {
              console.log("sent TL Data");
            },
            function(error) {
              console.log("Failed to send TL data. Error: " + error);
            }
          );
        }
      },

      startBulb: function startBulb(device) {
        var exposureTime =
          arguments.length > 1 && arguments[1] !== undefined
            ? arguments[1]
            : 0x00;

        var deferred = $q.defer();

        if (!device) {
          console.log("startBulb: no connected device");
          deferred.reject("no device is connected");
        } else {
          var bulbData = [
            0x00,
            0x01,
            $config.communication.SET_ACTION,
            $config.communication.ACTION_BULB_OPEN,
            exposureTime & 0xff,
            (exposureTime >> 8) & 0xff
          ];
          var buff = new Uint8Array(bulbData);
          BLE.write(
            device.id,
            $config.services.GATT_SERVICE_UUID_PULSE_COMMS_SERVICE,
            $config.characteristics.GATT_CHAR_UUID_UART_TX,
            buff.buffer,
            function(response) {
              deferred.resolve(response);
            },
            function(error) {
              deferred.reject("failed to start Long Exposure");
            }
          );
        }
      },

      endBulb: function endBulb(device) {
        var deferred = $q.defer();

        if (!device) {
          console.log("endBulb: no connected device");
          deferred.reject("no device is connected");
        } else {
          var bulbData = [
            0x00,
            0x01,
            $config.communication.SET_ACTION,
            $config.communication.ACTION_BULB_CLOSE
          ];
          var buff = new Uint8Array(bulbData);
          BLE.write(
            device.id,
            $config.services.GATT_SERVICE_UUID_PULSE_COMMS_SERVICE,
            $config.characteristics.GATT_CHAR_UUID_UART_TX,
            buff.buffer,
            function(response) {
              deferred.resolve(response);
            },
            function(error) {
              deferred.reject("failed to end Long Exposure");
            }
          );
        }
      },

      pauseTimelapse: function pauseTimelapse(device) {
        var deferred = $q.defer();

        if (!device) {
          console.log("pauseTimelapse: no connected device");
          deferred.reject("no device is connected");
        } else {
          console.log("pausing timelapse");
          var pauseData = [
            0x00,
            0x01,
            $config.communication.SET_ACTION,
            $config.communication.ACTION_TL_PAUSE
          ];
          var buff = new Uint8Array(pauseData);
          BLE.write(
            device.id,
            $config.services.GATT_SERVICE_UUID_PULSE_COMMS_SERVICE,
            $config.characteristics.GATT_CHAR_UUID_UART_TX,
            buff.buffer,
            function(response) {
              deferred.resolve(response);
            },
            function(error) {
              deferred.reject("failed to pauseTimelapse");
            }
          );
        }
      },

      killTimelapse: function killTimelapse(device) {
        var deferred = $q.defer();

        if (!device) {
          console.log("killTimelapse: no connected device");
          deferred.reject("no device is connected");
        } else {
          var killData = [
            0x00,
            0x01,
            $config.communication.SET_ACTION,
            $config.communication.ACTION_TL_STOP
          ];
          var buff = new Uint8Array(killData);
          BLE.write(
            device.id,
            $config.services.GATT_SERVICE_UUID_PULSE_COMMS_SERVICE,
            $config.characteristics.GATT_CHAR_UUID_UART_TX,
            buff.buffer,
            function(response) {
              deferred.resolve(response);
            },
            function(error) {
              deferred.reject("failed to kill timelapse");
            }
          );
        }
      },

      resumeTimelapse: function resumeTimelapse(device) {
        var deferred = $q.defer();
        console.log("resuming timelapse");

        if (!device) {
          console.log("resumeTimelapse: no connected device");
          deferred.reject("no device is connected");
        } else {
          var resumeData = [
            0x00,
            0x01,
            $config.communication.SET_ACTION,
            $config.communication.ACTION_TL_START
          ];
          var buff = new Uint8Array(resumeData);
          BLE.write(
            device.id,
            $config.services.GATT_SERVICE_UUID_PULSE_COMMS_SERVICE,
            $config.characteristics.GATT_CHAR_UUID_UART_TX,
            buff.buffer,
            function(response) {
              deferred.resolve(response);
            },
            function(error) {
              deferred.reject("failed to send resume TL");
            }
          );
        }
      },

      blinkLED: function blinkLED(device) {
        console.log("blinkLED");
        var blinkCount =
          arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
        var blinkOrSteady =
          arguments.length > 2 && arguments[2] !== undefined
            ? arguments[2]
            : $config.LED_BLINK;

        var deferred = $q.defer();

        if (!blinkOrSteady) {
          blinkCount = blinkCount * 1000;
        }

        if (!device) {
          console.log("blinkLED: no connected device");
          deferred.reject("no device is connected");
        } else {
          var blinkData = [
            0x00,
            0x01,
            $config.communication.FLASH_LED,
            blinkOrSteady,
            blinkCount & 0xff,
            (blinkCount >> 8) & 0xff,
            (blinkCount >> 16) & 0xff
          ];
          var buff = new Uint8Array(blinkData);
          BLE.write(
            device.id,
            $config.services.GATT_SERVICE_UUID_PULSE_COMMS_SERVICE,
            $config.characteristics.GATT_CHAR_UUID_UART_TX,
            buff.buffer,
            function(response) {
              deferred.resolve(response);
            },
            function(error) {
              deferred.reject("failed to send resume TL");
            }
          );
        }
      },

      getFirmWareVersion: function getFirmWareVersion(device) {
        var deferred = $q.defer();
        console.log("fetching firmware version");

        if (!device) {
          console.log("getFirmWareVersion: no connected device");
          deferred.reject("no device is connected");
        } else {
          var firmwareData = [0x00, 0x01, $config.communication.GET_FW_VERSION];
          var buff = new Uint8Array(firmwareData);
          BLE.write(
            device.id,
            $config.services.GATT_SERVICE_UUID_PULSE_COMMS_SERVICE,
            $config.characteristics.GATT_CHAR_UUID_UART_TX,
            buff.buffer,
            function(response) {
              deferred.resolve(response);
            },
            function(error) {
              deferred.reject("failed to request firmware version");
            }
          );
        }
        return deferred.promise;
      },

      getFirmwareType: function getFirmwareType(device) {
        console.log("inside getFirmwareType ");
        var deferred = $q.defer();
        console.log("fetching firmware type");

        if (!device) {
          console.log("getFirmwareType: no connected device");
          deferred.reject("no device is connected");
        } else {
          var typeData = [0x00, 0x01, $config.communication.GET_FW_TYPE];
          var buff = new Uint8Array(typeData);
          BLE.write(
            device.id,
            $config.services.GATT_SERVICE_UUID_PULSE_COMMS_SERVICE,
            $config.characteristics.GATT_CHAR_UUID_UART_TX,
            buff.buffer,
            function(response) {
              console.log("getFirmwareType BLE.write response");
              deferred.resolve(response);
            },
            function(error) {
              deferred.reject("failed to request firmware version");
            }
          );
        }

        return deferred.promise;
      },

      getMacAddress: function getMacAddress(device) {
        var deferred = $q.defer();
        console.log("fetching mac ddddd time, wtf");
        console.log("sytp");
        if (!device) {
          console.log("getMacAddress: no connected device");
          deferred.reject("no device is connected");
        } else {
          var macData = [0x00, 0x01, $config.communication.GET_CLASSIC_MAC];
          var buff = new Uint8Array(macData);
          BLE.write(
            device.id,
            $config.services.GATT_SERVICE_UUID_PULSE_COMMS_SERVICE,
            $config.characteristics.GATT_CHAR_UUID_UART_TX,
            buff.buffer,
            function(response) {
              console.log("getMacAddress : " + response);
              deferred.resolve(response);
            },
            function(error) {
              console.log("getMacAddress error : " + error);
              deferred.reject("failed to request firmware version");
            }
          );
        }
        return deferred.promise;
      },

      getPersistentData: function getPersistentData(device) {
        var deferred = $q.defer();
        console.log("fetching persistent data");

        if (!device) {
          console.log("getPersistentData: no connected device");
          deferred.reject("no device is connected");
        } else {
          var buff = new Uint8Array([
            0x00,
            0x01,
            $config.communication.GET_PERSISTENT_DATA
          ]);
          BLE.write(
            device.id,
            $config.services.GATT_SERVICE_UUID_PULSE_COMMS_SERVICE,
            $config.characteristics.GATT_CHAR_UUID_UART_TX,
            buff.buffer,
            function(response) {
              deferred.resolve(response);
            },
            function(error) {
              deferred.reject("failed to request persistent data");
            }
          );
        }
        return deferred.promise;
      },

      setPersistentData: function setPersistentData(pulse, data, page) {
        var deferred = $q.defer();

        var devicePlatform = device.platform;
        var deviceOS = $views.detectVersion(device.version);

        MTU = MTU - 6; // -3 for overhead, -3 because Sam messed up

        var pages = Math.ceil(data.length / MTU);
        console.log(
          "Data length is: " +
            data.length +
            "... setting persistent data page " +
            page +
            " of " +
            pages
        );
        if (!pulse) {
          console.log("setPersistentData: no connected device");
          deferred.reject("no device is connected");
        } else {
          var startIndex = MTU * page;

          var arr = [page, pages, $config.communication.SET_PERSISTENT_DATA];
          var u8 = new Uint8Array(data);
          arr.push.apply(arr, u8.subarray(startIndex, startIndex + MTU));

          // for (var i = 0; i < arr.length; i++) {
          //   console.log(arr[i]);
          // }
          var buff = new Uint8Array(arr);

          BLE.write(
            pulse.id,
            $config.services.GATT_SERVICE_UUID_PULSE_COMMS_SERVICE,
            $config.characteristics.GATT_CHAR_UUID_UART_TX,
            buff.buffer,
            function(response) {
              deferred.resolve(response);
            },
            function(error) {
              deferred.reject("failed to set persistent data");
            }
          );
        }

        MTU = MTU + 6;
        return deferred.promise;
      },

      systemReset: function systemReset(device) {
        var deferred = $q.defer();
        console.log("asking to reset the system");

        if (!device) {
          console.log("systemReset: no connected device");
          deferred.reject("no device is connected");
        } else {
          var data = [0x00, 0x01, $config.communication.SYSTEM_RESET, 0x0];
          var buff = new Uint8Array(data);
          BLE.write(
            device.id,
            $config.services.GATT_SERVICE_UUID_PULSE_COMMS_SERVICE,
            $config.characteristics.GATT_CHAR_UUID_UART_TX,
            buff.buffer,
            function(response) {
              deferred.resolve(response);
            },
            function(error) {
              deferred.reject("failed to request entering bootloader mode");
            }
          );
        }
        return deferred.promise;
      },

      enterBlMode: function enterBlMode(device) {
        var deferred = $q.defer();
        console.log("asking to enter bootloader mode");

        if (!device) {
          console.log("enterBLMode: no connected device");
          deferred.reject("no device is connected");
        } else {
          var data = [0x00, 0x01, $config.communication.SYSTEM_RESET, 0x1];
          var buff = new Uint8Array(data);
          BLE.write(
            device.id,
            $config.services.GATT_SERVICE_UUID_PULSE_COMMS_SERVICE,
            $config.characteristics.GATT_CHAR_UUID_UART_TX,
            buff.buffer,
            function(response) {
              deferred.resolve(response);
            },
            function(error) {
              deferred.reject("failed to request entering bootloader mode");
            }
          );
        }
        return deferred.promise;
      },

      resetBtc: function resetBtc(device) {
        var deferred = $q.defer();
        console.log("Resetting the BTC connection on Pulse");

        if (!device) {
          console.log("resetBtc: no connected device");
          deferred.reject("no device is connected");
        } else {
          var data = [0x00, 0x01, $config.communication.RESET_BTC];
          var buff = new Uint8Array(data);
          BLE.write(
            device.id,
            $config.services.GATT_SERVICE_UUID_PULSE_COMMS_SERVICE,
            $config.characteristics.GATT_CHAR_UUID_UART_TX,
            buff.buffer,
            function(response) {
              deferred.resolve(response);
            },
            function(error) {
              deferred.reject("failed to request btc reset");
            }
          );
        }
        return deferred.promise;
      },

      requestAnalytic: function requestAnalytic(device, analytic) {
        var deferred = $q.defer();
        console.log("Requesting device analytic");

        if (!device) {
          console.log("requestAnalytic: no connected device");
          deferred.reject("no device is connected");
        } else {
          var data = [
            0x00,
            0x01,
            $config.communication.GET_DEVICE_ANALYTICS,
            analytic
          ];
          var buff = new Uint8Array(data);
          BLE.write(
            device.id,
            $config.services.GATT_SERVICE_UUID_PULSE_COMMS_SERVICE,
            $config.characteristics.GATT_CHAR_UUID_UART_TX,
            buff.buffer,
            function(response) {
              deferred.resolve(response);
            },
            function(error) {
              deferred.reject("failed to request btc reset");
            }
          );
        }
        return deferred.promise;
      },

      // This will force the firmware to clear and renegotiate a new USB session
      // with the camera. If setTLRefresh == 1 then the firmware will refresh
      // the USB session every 10 captures during a TimeLapse
      refreshUSB: function refreshUSB(device) {
        var setTLRefresh =
          arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;

        var deferred = $q.defer();
        console.log("Requesting USB session be refreshed");

        if (!device) {
          console.log("refreshUSB: no connected device");
          deferred.reject("no device is connected");
        } else {
          var data = [
            0x00,
            0x01,
            $config.communication.REFRESH_USB_SESSION,
            setTLRefresh
          ];
          var buff = new Uint8Array(data);
          BLE.write(
            device.id,
            $config.services.GATT_SERVICE_UUID_PULSE_COMMS_SERVICE,
            $config.characteristics.GATT_CHAR_UUID_UART_TX,
            buff.buffer,
            function(response) {
              deferred.resolve(response);
            },
            function(error) {
              deferred.reject("failed to request usbRefresh");
            }
          );
        }
        return deferred.promise;
      },

      renameDevice: function renameDevice(device, nickname) {
        console.log("insdie renameDevice : " + nickname);
        var deferred = $q.defer();
        console.log("Renaming Pulse to " + nickname);

        if (!device) {
          console.log("renameDevice: no connected device");
          deferred.reject("no device is connected");
        } else {
          var buff = $views.stringtoBuffer(nickname);
          BLE.write(
            device.id,
            $config.services.GATT_SERVICE_UUID_DEV_INFO_SERVICE,
            $config.characteristics.GATT_CHAR_UUID_NICKNAME,
            buff.buffer,
            function(response) {
              deferred.resolve(response);
            },
            function(error) {
              deferred.reject("failed to request renameDevice");
            }
          );
        }
        return deferred.promise;
      },

      reportActivity: function reportActivity() {
        // console.log("Pushing activity to server");
        // $http({
        //   url: "http://pulse-mapper.herokuapp.com/api/pulse-map",
        //   method: "POST",
        //   headers: {
        //     'Content-Type': 'application/json',
        //     'Access-Control-Allow-Origin': '*'
        //   },
        //   data: JSON.stringify({
        //     ipAddress: ip
        //   })
        // }).success(function (data, status, headers, config) {
        //   console.log("Post activity success");
        // }).error(function (data, status, headers, config) {
        //   console.log("Post activity failure");
        //   console.dir(data);
        //   console.dir(status);
        //   console.dir(headers);
        //   console.dir(config);
        // });
      },

      reportAnalytics: function reportAnalytics(device) {
        // if (device.uptime > (Date.now() - PULSE_LAUNCH_UNIX_TIME) / 1000) {
        //   console.log("Pulse has an impossible uptime. Not sending to server.");
        //   return;
        // }
        // if (device.thumbnails > device.photos * 2) {
        //   console.log("Pulse has an improbable thumbnail count. Not sending to server.");
        //   return;
        // }
        // console.log("Pushing analytics to server");
        // var lytic = {
        //   ip: ip,
        //   time: Date.now(),
        //   uuid: device.uuid,
        //   nickname: device.localStorageInfo.nickname,
        //   photos: device.photos,
        //   videos: device.videos,
        //   timelapses: device.timelapses,
        //   tlComplete: device.timelapsesComplete,
        //   thumbnails: device.thumbnails,
        //   longExposures: device.longExposures,
        //   sessions: device.sessions,
        //   uptime: device.uptime,
        //   firmware: device.firmwareVersion,
        //   app: appVersion,
        //   mobilePlatform: $platform.getDevicePlatform(),
        //   mobileModel: $platform.getDeviceModel(),
        //   cameraModel: device.metaData.cameraModel,
        //   cameraType: device.metaData.cameraType
        // };
        // console.dir(lytic);
        // $http({
        //   url: "http://pulse-mapper.herokuapp.com/api/pulse-analytics",
        //   method: "POST",
        //   headers: {
        //     'Content-Type': 'application/json',
        //      'Access-Control-Allow-Origin': '*'
        //   },
        //   data: lytic
        // }).success(function (data, status, headers, config) {
        //   console.log("Post analytic success");
        // }).error(function (data, status, headers, config) {
        //   console.log("Post analytic failure");
        //   console.dir(data);
        //   console.dir(status);
        //   console.dir(headers);
        //   console.dir(config);
        // });
      },

      requestUUID: function requestUUID(device) {
        var deferred = $q.defer();
        console.log("Requesting Pulse UUID");

        if (!device) {
          console.log("requestUUID: no connected device");
          deferred.reject("no device is connected");
        } else {
          var data = [0x00, 0x01, $config.communication.GET_PULSE_UUID];
          var buff = new Uint8Array(data);
          BLE.write(
            device.id,
            $config.services.GATT_SERVICE_UUID_PULSE_COMMS_SERVICE,
            $config.characteristics.GATT_CHAR_UUID_UART_TX,
            buff.buffer,
            function(response) {
              deferred.resolve(response);
            },
            function(error) {
              deferred.reject("failed to requestUUID");
            }
          );
        }
        return deferred.promise;
      }
    };
  });
})();
