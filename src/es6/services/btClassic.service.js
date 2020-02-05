(function() {
  'use strict';
  pulse.services.factory('btClassic', function($q, $rootScope, $transmit, $timeout, $config, $cordovaNativeStorage, $platform) {

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
      read: function(address) {
        var deferred = $q.defer();

        BluetoothClassic.read(address,
          function(buffer) {
            var view = new Uint8Array(buffer);
            console.log('successfully read data over BT Classic');
            deferred.resolve(view);
          },
          function(error) {
            console.log('failed to read data over BT Classic');
            deferred.reject(error);
          });


        return deferred.promise;
      },

      disconnect: function(address) {
        if (!window.cordova) {
          return this.noCordova();
        }
        var deferred = $q.defer();

        BluetoothClassic.disconnect(address, () => {
          console.log('successfully disconnected device from BluetoothClassic');
          deferred.resolve();
        }, () => {
          deferred.reject();
          console.log('failed to disconnect device from BluetoothClassic');
        });
        return deferred.promise;
      },


      /**
       * write - writes to bluetooth classic
       * @param  {string} data  - the data to write
       * @return {promise} - response from BT classic
       */
      write: function(data) {
        if (!window.cordova) {
          return this.noCordova();
        }
        var deferred = $q.defer();

        BluetoothClassic.write(data, function(response) {
          //success cb
          console.log('BluetoothClassic wrote successfully');
          deferred.resolve(response);
        }, function(error) {
          //failure, write failed
          console.log('BluetoothClassic failed to write');
          deferred.reject(error);
        });

        return deferred.promise;
      },

      /**
       * connect - connects to a given BLE device
       * @param  {string} address-- the address of the bluetooth module to write to
       * @return {promise} -- response from the bluetooth
       */
      connect: function(address, device, deferred, toggleAction = false, bypassModal = false) {
        if (!deferred) {
          deferred = $q.defer();
        }
        if (!$rootScope.thumbCapable){
          //user does not have thumbnail capability. Don't connect
          deferred.reject();
          return deferred.promise;
        }
        if ((device.firmwareType == 'BAD_TIME') && !bypassModal) {

          var text;
          //device doesn't support BT Classic. Just get out
          if ($platform.isAndroid()){
            text = 'Your Pulse is running iOS firmware, but you are using an android device. In order for image review to work, we need to install android firmware. Do you want to install it now?';
          }
          else{
            text = 'Your Pulse is running android firmware, but you are using an iOS device. If you want faster thumbnail retrieval, we need to install iOS firmware. Do you want to install it now?';
          }
          var modalData = {
            text: text,
            onButtonClick: function() {
              if (!$platform.isAndroid()){
                $rootScope.$broadcast('btConnect', {address: address, device: device, deferred: deferred});
              }
            },
            onYesButtonClick: function() {

            },
            assignedClass: 'firmware-diff',
            animation: 'fade-in-scale',
            twoButton: true,
            firmware: true

          };
          $rootScope.$broadcast('openModal', modalData);
          deferred.reject();
          return deferred.promise;
        }

        if (!window.cordova) {
          deferred.resolve(this.noCordova());
          return this.noCordova();
        }
        console.log("starting BTC connect");
        BluetoothClassic.connect(address,
          (result) => {
            console.log('BluetoothClassic connection succeeded');
            deferred.resolve(result);
            $rootScope.$broadcast('firmwareModalTime', {});
            $rootScope.$broadcast('btConnect', {success: true});

          },
          (error) => {
            console.log('BluetoothClassic connection failed');
            settings.connected = false;
            $transmit.resetBtc(device);

            if (typeof error == 'string' && error.includes('show picker')) {
              var classicName = device.currentName || 'My Pulse';
              var modalData = {
                text: 'Select ' + classicName + ' on the next screen (may take a few seconds).',
                animation: 'fade-in-scale',
                classicModal: true,
                hasCheckbox: true,
                checkboxText: 'Don’t remind me again.',
                checkboxAction: function() {
                  $cordovaNativeStorage.getItem('shouldWarnPicker').then((status) => {
                    $cordovaNativeStorage.setItem('shouldWarnPicker', !status);
                  });
                },
                assignedClass: 'btClassicAlert',
                onButtonClick: function() {
                  BluetoothClassic.showPicker(
                    (result) => {
                      deferred.resolve(result);
                      $rootScope.$broadcast('firmwareModalTime', {});
                      $rootScope.$broadcast('btConnect', {success: true});
                    },
                    (error) => {
                      $rootScope.$broadcast('firmwareModalTime', {});
                      if (error == $config.classicPickerResponses.MANUALLY_CLOSED) {
                        console.log('picker was manually closed prior to connection');
                      } else if (error == $config.classicPickerResponses.CONNECTION_FAILURE) {
                        console.log('bluetooth classic picker connection failure');
                      }
                      deferred.reject(error);
                    }
                  );
                },
              };

              $cordovaNativeStorage.getItem('shouldWarnPicker').then((shouldWarnPicker) => {
                if (shouldWarnPicker) {
                  $rootScope.$broadcast('openModal', modalData);
                } else {
                  $timeout(()=>{
                    BluetoothClassic.showPicker(
                      (result) => {
                        this.connect(address, device, deferred);
                      },
                      (error) => {
                        $rootScope.$broadcast('firmwareModalTime', {});
                        if (error == $config.classicPickerResponses.MANUALLY_CLOSED) {
                          console.log('picker was manually closed prior to connection');
                        } else if (error == $config.classicPickerResponses.CONNECTION_FAILURE) {
                          console.log('bluetooth classic picker connection failure');
                        }
                        console.log('connection failed after picker attempt');
                        deferred.reject(error);
                      }
                    );

                  }, 500);
                }
              });

            }
            else{
              $rootScope.$broadcast('firmwareModalTime', {appCheckOnly: true});
              deferred.reject(error);
            }
            if (!toggleAction) {
              deferred.reject(error);
            }
          }
        );

        return deferred.promise;
      },

      isConnected: function(address) {
        var deferred = $q.defer();

        if (!window.cordova) {
          deferred.resolve(this.noCordova());
          return this.noCordova();
        }
        BluetoothClassic.isConnected(address,
          function(response) {
            deferred.resolve(response);
          },
          function(error) {
            deferred.reject(error);
          });
        return deferred.promise;
      },

      /**
       * noCordova - handles the response when the requesting device does not have bluetooth
       * @return {promise} a rejection error message
       */
      noCordova: function() {

        var deferred = $q.defer();
        deferred.reject('cordova is not active');
        return deferred.promise;
      },

      closeSession: function() {
        var deferred = $q.defer();

        BluetoothClassic.closeSession(
          (result) => {
            console.log("BTC session closed");
            deferred.resolve(result);
          },
          (error) => {
            console.log("Problem closing BTC session!");
            deferred.reject(error);
          }
        );

        return deferred.promise;
      }
    };
  });
})();
