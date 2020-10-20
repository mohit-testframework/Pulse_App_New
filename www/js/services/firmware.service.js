"use strict";

(function() {
  "use strict";

  pulse.services.factory("$firmware", function(
    $q,
    $cordovaFileTransfer,
    $cordovaNativeStorage,
    $cordovaFile,
    $transmit,
    $timeout,
    $views,
    $config,
    BLE,
    $platform,
    $location,
    $rootScope,
    btClassic,
    $ionicLoading
  ) {
    var BOOTLOADER_PACKET_SIZE = 128;
    var erase_pkt = new Array(0, $config.bootloader.OP_ERASE_FLASH, 0, 0); //,0x2c,0,0,0) ;//,9,10,11,12,13,14,15];
    var write1_pkt,
      completionPercentage = 0;
    var SYFHandle;
    var masterTimer;
    var proceed = true;

    var settings = {
      sendIndex: undefined,
      finalPacketIndex: undefined,
      bootloaderDevice: undefined,
      firmwareBinary: undefined,
      completionPercentage: completionPercentage
    };

    $rootScope.$on("cancelUpdate", function() {
      proceed = false;
      $timeout(function() {
        proceed = true;
      }, 10000);
    });

    return {
      settings: settings,

      getCompatability: function getCompatability() {
        var deferred = $q.defer();
        if (!window.cordova) {
          deferred.reject("no cordova");
        } else {
          var url =
            "https://s3-us-west-1.amazonaws.com/alpine-firmware/pulse-firmware/menu-compatability.json";
          var targetPath;
          if ($platform.isAndroid()) {
            targetPath =
              cordova.file.externalApplicationStorageDirectory +
              "compatability.json";
          } else {
            targetPath = cordova.file.documentsDirectory + "compatability.json";
          }
          var options = {},
            trustHosts = true;

          $cordovaFileTransfer
            .download(url, targetPath, options, trustHosts)
            .then(
              function(result) {
                var path;
                if ($platform.isAndroid()) {
                  path = cordova.file.externalApplicationStorageDirectory;
                } else {
                  path = cordova.file.documentsDirectory;
                }
                $cordovaFile.readAsText(path, "compatability.json").then(
                  function(data) {
                    var compatability = JSON.parse(unescape(data));
                    deferred.resolve(compatability.invalidCameraList);
                  },
                  function(error) {
                    deferred.reject(error);
                  }
                );
              },
              function(err) {
                deferred.reject(err);
              },
              function(progress) {}
            );
        }
        return deferred.promise;
      },

      syncMenuCompatability: function syncMenuCompatability() {
        var deferred = $q.defer();
        this.getCompatability().then(
          function(compatabilityList) {
            $cordovaNativeStorage.setItem(
              "menu-compatability",
              compatabilityList
            );
            $views.invalidCameraList = compatabilityList;
            deferred.resolve();
          },
          function() {
            deferred.resolve();
          }
        );
        return deferred.promise;
      },

      getMostRecentFirmwareVersion: function getMostRecentFirmwareVersion() {
        var deferred = $q.defer();
        if (!window.cordova) {
          deferred.reject("no cordova");
        } else {
          // cordova.getAppVersion.getVersionNumber(
          //   function(version) {
          //     // alert(version);
          //     appVersion = version;
          //     console.log("Version is " + version);
          //   },
          //   function(error) {
          //     // alert(error);
          //     // appVersion = version;
          //     console.log("Version is " + error);
          //   });

            cordova.getAppVersion.getVersionNumber().then(function(version) {
                // $('.version').text(version);
                console.log('getVersionNumber Version app.js page ' + version);    
                appVersion = version;
            },function (error) {
                  // alert(error);
                // appVersion = version;
                   console.log('error version is app.js page ' + error);    
            });

          var url = "https://alpinelabs.s3-us-west-1.amazonaws.com/firmware-version-fota.json";
            // "https://s3-us-west-1.amazonaws.com/alpine-firmware/pulse-firmware/" +
            // appVersion +
            // "/firmware-version-fota.json";
          var targetPath;
          if ($platform.isAndroid()) {
            targetPath =
              cordova.file.externalApplicationStorageDirectory +
              "firmware.json";
          } else {
            targetPath = cordova.file.documentsDirectory + "firmware.json";
          }
          var options = {},
            trustHosts = true;

          $cordovaFileTransfer
            .download(url, targetPath, options, trustHosts)
            .then(
              function(result) {
                var path;
                if ($platform.isAndroid()) {
                  path = cordova.file.externalApplicationStorageDirectory;
                } else {
                  path = cordova.file.documentsDirectory;
                }

                $cordovaFile.readAsText(path, "firmware.json").then(
                  function(success) {
                    var mostRecentFirmware = JSON.parse(unescape(success));
                    deferred.resolve(mostRecentFirmware);
                  },
                  function(error) {
                    deferred.reject(error);
                  }
                );
              },
              function(err) {
                deferred.reject(err);
              },
              function(progress) {}
            );
        }
        return deferred.promise;
      },

      getMostRecentFirmware: function getMostRecentFirmware() {
        var deferred = $q.defer();
        if (!window.cordova) {
          deferred.reject("no cordova");
        } else {
          cordova.getAppVersion.getVersionNumber(
            function(version) {
              // alert(version);
              appVersion = version;
              console.log("Version is " + version);
              var targetPath,
                options = {},
                trustHosts = true;

              var url;
              if ($platform.isAndroid()) {
                url = "https://alpinelabs.s3-us-west-1.amazonaws.com/pulse-firmware-dual.bin";
                  // "https://s3-us-west-1.amazonaws.com/alpine-firmware/pulse-firmware/" +
                  // appVersion +
                  // "/pulse-firmware-dual.bin";
                targetPath =
                  cordova.file.externalApplicationStorageDirectory +
                  "firmware.bin";
              } else {
                url = "https://alpinelabs.s3-us-west-1.amazonaws.com/pulse-firmware-ios.bin";
                  // "https://s3-us-west-1.amazonaws.com/alpine-firmware/pulse-firmware/" +
                  // appVersion +
                  // "/pulse-firmware-ios.bin";
                targetPath = cordova.file.documentsDirectory + "firmware.bin";
              }

              $cordovaFileTransfer
                .download(url, targetPath, options, trustHosts)
                .then(
                  function(result) {
                    console.log("Succesfully retrieved firmware binary.");
                    deferred.resolve(result);
                  },
                  function(err) {
                    console.log(
                      "Firmware binary retrieval failed. Trying local fallback : " +
                        JSON.stringify(err)
                    );
                    var localPath;
                    if ($platform.isAndroid()) {
                      localPath =
                        cordova.file.applicationDirectory +
                        "www/firmware/pulse-firmware-dual.bin";
                    } else {
                      localPath =
                        cordova.file.applicationDirectory +
                        "www/firmware/pulse-firmware-ios.bin";
                    }
                    $cordovaFileTransfer
                      .download(localPath, targetPath, options, trustHosts)
                      .then(
                        function(result) {
                          console.log("fetched local binary copy");
                          deferred.resolve(result);
                        },
                        function(error2) {
                          console.log(
                            "failed to fetch local binary copy : " +
                              JSON.stringify(error2)
                          );
                          deferred.reject(error2);
                        }
                      );
                  },
                  function(progress) {}
                );
            },
            function(error) {
              // alert(error);
              // appVersion = version;
              console.log("Version is " + error);
            }
          );
        }
        return deferred.promise;
      },

      readUpdateFirmware: function readUpdateFirmware() {
        console.log("Inside readUpdateFirmware.");
        var _this = this;

        var deferred = $q.defer();
        this.getMostRecentFirmware().then(
          function(firmwareFile) {
            _this.readFirmwareFile(firmwareFile).then(
              function(arrayBuffer) {
                console.log("Succesfully read firmware data.");
                deferred.resolve(arrayBuffer);
              },
              function(error) {
                deferred.reject(error);
                console.log("failed to read firmware bin file");
              }
            );
          },
          function(error) {
            console.log(
              "failed to download firmware bin file. trying local copy"
            );
          }
        );
        return deferred.promise;
      },

      readFirmwareFile: function readFirmwareFile(firmwareFile) {
        var deferred = $q.defer();
        var path = "";
        if ($platform.isAndroid()) {
          path = cordova.file.externalApplicationStorageDirectory;
        } else {
          path = cordova.file.documentsDirectory;
        }

        $cordovaFile.readAsArrayBuffer(path, firmwareFile.name).then(
          function(arrayBuffer) {
            deferred.resolve(arrayBuffer);
          },
          function(error) {
            console.log("Buffering in firmware as array failed: " + error);
            deferred.reject(error);
          }
        );
        return deferred.promise;
      },

      connectToBL: function connectToBL(device) {
        var _this2 = this;

        var deferred = $q.defer();
        if (proceed) {
          //*****START scanForBootloader CLOSURE******

          var scanForBootloader = function scanForBootloader() {
            if (masterTimer) {
              $timeout.cancel(masterTimer);
            }
            $timeout(function() {
              masterTimer = $timeout(function() {
                var modalData = {
                  text:
                    "There was a problem putting your Pulse into Update Mode. Please restart the App and your Pulse then try again.",
                  onButtonClick: function onButtonClick() {
                    console.log("Could not put Pulse into Update Mode");
                    ionic.Platform.exitApp();
                  },
                  animation: "fade-in-scale"
                };
                $ionicLoading.hide();
                $rootScope.$broadcast("openModal", modalData);
              }, 61000);

              BLE.stopScan().then(function() {
                console.log("scanning for bootloader device");

                var scanArray = [];
                if ($platform.isAndroid()) {
                  //android needs help and has to be told what services to scan for
                  //scanArray = [$config.bootloader.BL_SERVICE];
                }
                navigator.geolocation.getCurrentPosition (function (geolocation_res) {
                  console.log('inside geolocation_res response : ', geolocation_res);
                ble.startScan(
                  scanArray,
                  function(peripheral) {
                    console.log("Scan result: " + peripheral.name);
                    if (peripheral && peripheral.name == "Pulse Bootloader") {
                      BLE.stopScan().then(
                        function() {
                          $timeout.cancel(masterTimer);
                          peripheral.callbacks = {
                            disconnectCallback: function disconnectCallback() {
                              _this2.handleDisconnect(peripheral);
                            }
                          };

                          var increaseMTU = function increaseMTU(device) {
                            var def = $q.defer();

                            if ($platform.isAndroid()) {
                              console.log("Attempting to increase MTU");
                              ble.requestMtu(
                                device.id,
                                158,
                                function(mtu) {
                                  console.log("mtu set to: " + mtu);
                                  $transmit.setMTU(mtu - 3);
                                  def.resolve();
                                },
                                function(error) {
                                  console.log(
                                    "Firmware updates not supported on this device: " +
                                      error
                                  );
                                  def.resolve();
                                }
                              );
                            } else {
                              def.resolve();
                            }

                            return def.promise;
                          };

                          console.log(
                            "trying to connect to ID: " + peripheral.id
                          );
                          console.dir(peripheral);
                          ble.connect(
                            peripheral.id,
                            function(dev) {
                              console.log(
                                "Connected to bootloader... increasing MTU"
                              );
                              BLE.stopScan().then(function() {
                                increaseMTU(dev).then(function() {
                                  deferred.resolve(dev);
                                });
                              });
                            },
                            function(error) {
                              console.log(
                                "disconnected from pulse bootloader device"
                              );
                              if (
                                peripheral.callbacks &&
                                peripheral.callbacks.disconnectCallback
                              ) {
                                peripheral.callbacks.disconnectCallback();
                              }
                              $rootScope.$broadcast("scanBLE");
                              deferred.reject(error);
                            }
                          );
                        },
                        function(error) {
                          console.log(
                            "we cant stop the scan. Lets start everything over again"
                          );
                          deferred.reject(error);
                        }
                      );
                    }
                  }, function(error) {
                    console.log(
                      "Error scanning for bootloader. Rejecting promise."
                    );
                    deferred.reject(error);
                  });

                    }, function (error) {
                      console.log('inside geolocation_res error : ', error);
                    });                
              });
            }, 2000);
          };

          //*****END scanForBootloader CLOSURE******

          BLE.stopScan().then(function() {
            $transmit.enterBlMode(device);

            var that = _this2;
            if ($platform.isAndroid()) {
              console.log(
                "Platform is Android. Need to clear the BT cache to find the Bootloader..."
              );
              $timeout(function() {
                BluetoothClassic.clearCache(
                  function() {
                    $timeout(function() {
                      BLE.disconnect(device).then(function() {
                        scanForBootloader();
                      });
                    }, 1000);
                  },
                  function() {
                    console.log("Clearing the cache failed");
                  }
                );
              }, 2000);
            } else {
              scanForBootloader();
            }
          });
        } else {
          proceed = true;
          $location.path("app/main");
          $ionicLoading.hide();
        }

        return deferred.promise;
      },

      handleDisconnect: function handleDisconnect(device, deferred) {
        var _this3 = this;

        if (!deferred) {
          deferred = $q.defer();
        }

        //don't do anything for non-mobile
        if (!window.cordova) {
          BLE.noCordova();
          deferred.resolve({ message: "No Cordova", success: false });
          return deferred.promise;
        }

        ble.disconnect(
          device.id,
          function(event) {
            ble.isConnected(
              device.id,
              function() {
                console.log(
                  "failed to disconnect device. Attempting to Disconnect again"
                );
                _this3.handleDisconnect(device, deferred);
              },
              function() {
                if (device.name == "Pulse Bootloader") {
                  console.log(
                    "successfully disconnected from Pulse Bootloader"
                  );
                  deferred.resolve({
                    message: "Removed bootloader id " + device.id,
                    success: true
                  });
                  return deferred.promise;
                }
              }
            );
          },
          function(error) {
            deferred.reject(error);
            return deferred.promise;
          }
        );
        return deferred.promise;
      },

      FWInsuranceTimer: SYFHandle, // Promise for timeout, need to clear it after finished

      update: function update(dataArray, device) {
        settings.finalPacketIndex = Math.ceil(
          dataArray.length / BOOTLOADER_PACKET_SIZE
        ); //get our final packet index

        var deferred = $q.defer();
        var haveStarted = false;

        var saveYourFOTA = function saveYourFOTA() {
          // We have not rx'd a packet in 1 second. Let's get it going again... Brother
          console.log("Saved the FOTA. Hoorah");
          ble.read(
            device.id,
            $config.bootloader.BL_SERVICE,
            $config.bootloader.CMD_CHANNEL,
            bootloaderRX,
            function(error) {
              console.log("Failed to read blRX: " + error);
            }
          );
        };

        var setupWrite1 = function setupWrite1() {
          write1_pkt = new Uint8Array(
            $views.numToArray4($views.decToHex(dataArray.length))
          );
          console.log(
            "Final Packet Index: " +
              settings.finalPacketIndex +
              " . Data Length: " +
              dataArray.length
          );
        };
        var tranError = function tranError(reason) {
          console.log("Transmit error: " + reason);
        };

        var fwCommandTransmit = function fwCommandTransmit(cmd) {
          console.log('inside fwCommandTransmit');
          ble.write(
            device.id,
            $config.bootloader.BL_SERVICE,
            $config.bootloader.CMD_CHANNEL,
            $views.numToArray2(cmd),
            function(res) {},
            tranError
          );
        };

        // Transmit firmware binary packet
        var fwDataTransmit = function fwDataTransmit(packetNum) {
          var array = new Uint8Array(
            new ArrayBuffer(BOOTLOADER_PACKET_SIZE + 2)
          );
          array[0] = 0x00ff & packetNum; //load in the LSB
          array[1] = (0xff00 & packetNum) >> 8; //load in the MSB

          var i;
          if (packetNum == 0xffff) {
            //check if we're sending the erase packet

            console.log("Loading erase command into packet.");
            for (i = 0; i < 4; i++) {
              array[i + 2] = $views.decToHex(erase_pkt[i]); //move over the erase packet data
            }
          } else if (packetNum === 0) {
            //check if we're sending the first write packet

            console.log(
              "Loading initial write command with transfer length & MTU into packet."
            );
            for (i = 0; i < 4; i++) {
              array[i + 2] = $views.decToHex(write1_pkt[i]); //move over the write1 packet data
            }
            //this is new- send over how large the packet will be
            array[6] = BOOTLOADER_PACKET_SIZE;
          } else if (
            (packetNum - 1) * BOOTLOADER_PACKET_SIZE <=
            dataArray.length
          ) {
            //if we're sending a regular data hunk

            packetNum -= 1; //knock packet num down 1 since we index from 1 in this system
            for (i = 0; i < BOOTLOADER_PACKET_SIZE; i++) {
              if (packetNum * BOOTLOADER_PACKET_SIZE + i >= dataArray.length) {
                array[i + 2] = 0;
              } else {
                array[i + 2] = $views.decToHex(
                  dataArray[packetNum * BOOTLOADER_PACKET_SIZE + i]
                );
              }
            }
          } else {
            console.log("Data to send is out of bounds. Aborting!");
            return;
          }
          console.log('inside fwDataTransmit');
          ble.write(
            device.id,
            $config.bootloader.BL_SERVICE,
            $config.bootloader.DATA_CHANNEL,
            array.buffer,
            function(res) {},
            tranError
          );
        };

        var bootloaderRX = function bootloaderRX(buffer) {
          $timeout.cancel(SYFHandle);
          var data = new Uint8Array(buffer);

          settings.sendIndex = data[0] | (data[1] << 8);
          $rootScope.$broadcast("sendIndex change", {
            sendIndex: settings.sendIndex,
            finalPacketIndex: settings.finalPacketIndex
          });

          var dec = settings.sendIndex / settings.finalPacketIndex;
          settings.completionPercentage = dec.toFixed(2) * 100;

          switch (settings.sendIndex) {
            // IDLE can be both an actual idle and the zeroth packet
            case $config.bootloader.IDLE:
              if (haveStarted) {
                console.log("Send Index is " + settings.sendIndex);
                fwDataTransmit(settings.sendIndex + 1);
              } else {
                haveStarted = !haveStarted;
                console.log("Bootloader is idle. Initiating FOTA.");
                fwCommandTransmit($config.bootloader.HANDSHAKE);
              }
              break;

            case $config.bootloader.UPDATE_CONFIRMED:
              console.log("Confirmed update process. Sending erase command.");
              fwDataTransmit($config.bootloader.ERASE_FLASH);
              break;

            case $config.bootloader.BL_PING:
              console.log("Pinging bootloader.");
              break;

            case $config.bootloader.START_TRANSFER:
              console.log("Starting data transfer.");
              fwDataTransmit(0);
              break;

            case settings.finalPacketIndex:
              console.log("FINAL PACKET");
              fwCommandTransmit($config.bootloader.FINISH_TRANSFER);
              deferred.resolve();
              break;

            case $config.bootloader.INVALID1:
            case $config.bootloader.INVALID2:
            case $config.bootloader.INVALID3:
              console.log("Received invalid response.");
              // TODO: What should we do here besides logging it??
              break;

            default:
              if (settings.sendIndex > 5 && haveStarted) {
                haveStarted = !haveStarted; // Clear this flag incase we go down
              }
              if (settings.sendIndex % 150 === 0) {
                console.log("Send Index is " + settings.sendIndex);
              }
              fwDataTransmit(settings.sendIndex + 1);
              break;
          }

          SYFHandle = $timeout(saveYourFOTA, 1000);
        };

        var kickOff = function kickOff() {
          // Subscribe for Rx notification
          console.log("Beginning transfer");
          setupWrite1();

          ble.startNotification(
            device.id,
            $config.bootloader.BL_SERVICE,
            $config.bootloader.CMD_CHANNEL,
            bootloaderRX,
            function(error) {}
          );

          SYFHandle = $timeout(saveYourFOTA, 1000);

          ble.read(
            device.id,
            $config.bootloader.BL_SERVICE,
            $config.bootloader.CMD_CHANNEL,
            bootloaderRX,
            function(error) {
              console.log("Failed to read blRX: " + error);
            }
          );
        };

        console.log("Starting firmware update.");
        kickOff();

        return deferred.promise;
      }
    };
  });
})();
