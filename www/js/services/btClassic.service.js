"use strict";

(function() {
  "use strict";

  pulse.services.factory("btClassic", function(
    $q,
    $rootScope,
    $transmit,
    $timeout,
    $config,
    $cordovaNativeStorage,
    $platform
  ) {
    var settings = {
      connected: false,
      enabled: true
    };

    return {
      settings: settings,

      /**
       * read - reads data from bluetooth
       * @return {promise} - the read data
       */
      read: function read(address) {
        //console.log("inside BTClassic read");
        var deferred = $q.defer();

        BluetoothClassic.read(
          address,
          function(buffer) {
            var view = new Uint8Array(buffer);
            //console.log("successfully read data over BT Classic : " + buffer);
            deferred.resolve(view);
          },
          function(error) {
            //console.log("failed to read data over BT Classic : " + error);
            deferred.reject(error);
          }
        );

        return deferred.promise;
      },

      disconnect: function disconnect(address) {
        //console.log("inside BTClassic disconnect");
        if (!window.cordova) {
          return this.noCordova();
        }
        var deferred = $q.defer();

        BluetoothClassic.disconnect(
          address,
          function() {
            // console.log(
            //   "successfully disconnected device from BluetoothClassic"
            // );
            deferred.resolve();
          },
          function() {
            deferred.reject();
            //console.log("failed to disconnect device from BluetoothClassic");
          }
        );
        return deferred.promise;
      },

      /**
       * write - writes to bluetooth classic
       * @param  {string} data  - the data to write
       * @return {promise} - response from BT classic
       */
      write: function write(data) {
        //console.log("inside BTClassic write");
        if (!window.cordova) {
          return this.noCordova();
        }
        var deferred = $q.defer();

        BluetoothClassic.write(
          data,
          function(response) {
            //success cb
            //console.log("BluetoothClassic wrote successfully");
            deferred.resolve(response);
          },
          function(error) {
            //failure, write failed
            //console.log("BluetoothClassic failed to write");
            deferred.reject(error);
          }
        );

        return deferred.promise;
      },

      /**
       * connect - connects to a given BLE device
       * @param  {string} address-- the address of the bluetooth module to write to
       * @return {promise} -- response from the bluetooth
       */
      connect: function connect(address, device, deferred) {
        //console.log("inside BTClassic connect,lgg: " + address);
        var _this = this;

        var toggleAction =
          arguments.length > 3 && arguments[3] !== undefined
            ? arguments[3]
            : false;
        var bypassModal =
          arguments.length > 4 && arguments[4] !== undefined
            ? arguments[4]
            : false;

        if (!deferred) {
          deferred = $q.defer();
        }
        if (!$rootScope.thumbCapable) {
          //user does not have thumbnail capability. Don't connect
          deferred.reject();
          return deferred.promise;
        }
        if (device.firmwareType == "BAD_TIME" && !bypassModal) {
          var text;
          //device doesn't support BT Classic. Just get out
          if ($platform.isAndroid()) {
            text =
              "Your Pulse is running iOS firmware, but you are using an android device. In order for image review to work, we need to install android firmware. Do you want to install it now?";
          } else {
            text =
              "Your Pulse is running android firmware, but you are using an iOS device. If you want faster thumbnail retrieval, we need to install iOS firmware. Do you want to install it now?";
          }
          var modalData = {
            text: text,
            onButtonClick: function onButtonClick() {
              if (!$platform.isAndroid()) {
                $rootScope.$broadcast("btConnect", {
                  address: address,
                  device: device,
                  deferred: deferred
                });
              }
            },
            onYesButtonClick: function onYesButtonClick() {},
            assignedClass: "firmware-diff",
            animation: "fade-in-scale",
            twoButton: true,
            firmware: true
          };
          $rootScope.$broadcast("openModal", modalData);
          deferred.reject();
          return deferred.promise;
        }

        if (!window.cordova) {
          deferred.resolve(this.noCordova());
          return this.noCordova();
        }
        //console.log("starting BTC connect ****** : " + address);
        BluetoothClassic.connect(
          address,
          function(result) {
            //console.log("BluetoothClassic connection succeeded");
            deferred.resolve(result);
            $rootScope.$broadcast("firmwareModalTime", {});
            $rootScope.$broadcast("btConnect", { success: true });
          },
          function(error) {
            //console.log("BluetoothClassic connection failed");
            settings.connected = false;
            $transmit.resetBtc(device);

            if (typeof error == "string" && error.includes("show picker")) {
              var classicName = device.currentName || "My Pulse";
              var modalData = {
                text:
                  "Select " +
                  classicName +
                  " on the next screen (may take a few seconds).",
                animation: "fade-in-scale",
                classicModal: true,
                hasCheckbox: true,
                checkboxText: "Don’t remind me again.",
                checkboxAction: function checkboxAction() {
                  $cordovaNativeStorage
                    .getItem("shouldWarnPicker")
                    .then(function(status) {
                      $cordovaNativeStorage.setItem(
                        "shouldWarnPicker",
                        !status
                      );
                    });
                },
                assignedClass: "btClassicAlert",
                onButtonClick: function onButtonClick() {
                  BluetoothClassic.showPicker(
                    function(result) {
                      deferred.resolve(result);
                      $rootScope.$broadcast("firmwareModalTime", {});
                      $rootScope.$broadcast("btConnect", { success: true });
                    },
                    function(error) {
                      $rootScope.$broadcast("firmwareModalTime", {});
                      if (
                        error == $config.classicPickerResponses.MANUALLY_CLOSED
                      ) {
                        //console.log("picker was manually closed prior to connection");
                      } else if (
                        error ==
                        $config.classicPickerResponses.CONNECTION_FAILURE
                      ) {
                        //console.log("bluetooth classic picker connection failure");
                      }
                      deferred.reject(error);
                    }
                  );
                }
              };

              $cordovaNativeStorage
                .getItem("shouldWarnPicker")
                .then(function(shouldWarnPicker) {
                  if (shouldWarnPicker) {
                    $rootScope.$broadcast("openModal", modalData);
                  } else {
                    $timeout(function() {
                      BluetoothClassic.showPicker(
                        function(result) {
                          _this.connect(address, device, deferred);
                        },
                        function(error) {
                          $rootScope.$broadcast("firmwareModalTime", {});
                          if (
                            error ==
                            $config.classicPickerResponses.MANUALLY_CLOSED
                          ) {
                            // console.log(
                            //   "picker was manually closed prior to connection"
                            // );
                          } else if (
                            error ==
                            $config.classicPickerResponses.CONNECTION_FAILURE
                          ) {
                            // console.log(
                            //   "bluetooth classic picker connection failure"
                            // );
                          }
                          //console.log("connection failed after picker attempt");
                          deferred.reject(error);
                        }
                      );
                    }, 500);
                  }
                });
            } else {
              $rootScope.$broadcast("firmwareModalTime", {
                appCheckOnly: true
              });
              deferred.reject(error);
            }
            if (!toggleAction) {
              deferred.reject(error);
            }
          }
        );

        return deferred.promise;
      },

      isConnected: function isConnected(address) {
        //console.log("inside BTClassic isConnected");
        var deferred = $q.defer();

        if (!window.cordova) {
          deferred.resolve(this.noCordova());
          return this.noCordova();
        }
        BluetoothClassic.isConnected(
          address,
          function(response) {
            deferred.resolve(response);
          },
          function(error) {
            deferred.reject(error);
          }
        );
        return deferred.promise;
      },

      /**
       * noCordova - handles the response when the requesting device does not have bluetooth
       * @return {promise} a rejection error message
       */
      noCordova: function noCordova() {
        //console.log("inside BTClassic noCordova");
        var deferred = $q.defer();
        deferred.reject("cordova is not active");
        return deferred.promise;
      },

      closeSession: function closeSession() {
        //console.log("inside BTClassic closeSession");
        var deferred = $q.defer();

        BluetoothClassic.closeSession(
          function(result) {
            //console.log("BTC session closed");
            deferred.resolve(result);
          },
          function(error) {
            //console.log("Problem closing BTC session!");
            deferred.reject(error);
          }
        );

        return deferred.promise;
      }
    };
  });
})();
