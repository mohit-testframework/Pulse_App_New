(function() {
  'use strict';
  pulse.services.factory('$fileSystem', function($q, $cordovaFile) {

    return {

      write: function(path, fileName, blob) {
        var deferred = $q.defer();
        if (!window.cordova) {
          return deferred.resolve();
        } else {
          $cordovaFile.createFile(path, fileName, true).then((response) => {
            $cordovaFile.writeFile(path, fileName, blob, true).then((response) => {
              deferred.resolve(response);
            }, (error) => {
              deferred.reject(error);
            });
          }, (error) => {
            deferred.reject(error);
          });
        }
        return deferred.promise;
      },

      removeFiles: function(path, directory) {

      },

      createDir: function(path, directory) {
        var deferred = $q.defer();
        if (!window.cordova) {
          return deferred.resolve();
        } else {
          $cordovaFile.createDir(path, directory, false).then((success) => {
            deferred.resolve();
          }, (error) => {
            deferred.resolve();
          });
        }
        return deferred.promise;

      },

      saveThumb: function(path, fileName, blob) {
        var deferred = $q.defer();
        if (!window.cordova) {
          return deferred.resolve();
        } else {
          this.createDir(path, 'thumbnails').then((success) => {
            this.write(path, 'thumbnails/' + fileName, blob).then((success) => {
              deferred.resolve(success.target.localURL);
            }, (error) => {
              deferred.reject();
            });
          });
        }
        return deferred.promise;
      },

      clearDirectory: function(path, directory){
        var deferred = $q.defer();
        if (!window.cordova){
          return deferred.resolve();
        }
        else{
          $cordovaFile.removeRecursively(path, 'thumbnails').then((sucess)=>{
            deferred.resolve();
          }, (error) => {
            deferred.resolve();
          });
        }
        return deferred.promise;
      }

    };
  });
})();
