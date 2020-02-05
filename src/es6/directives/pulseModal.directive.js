(function() {
  'use strict';
  pulse.app.directive('pulseModal', [function() {
    return {
      restrict: 'E',
      link: function() {},
      scope: {
        control: '='
      },
      controller: function($ionicModal, $scope, $cordovaNativeStorage, $ionicPlatform) {
        $scope.internalControl = $scope.control || {};
        $scope.modalClasses = [
          'slide-in-up',
          'slide-in-down',
          'fade-in-scale',
          'fade-in-right',
          'fade-in-left',
          'newspaper',
          'jelly',
          'road-runner',
          'splat',
          'spin',
          'swoosh',
          'fold-unfold'
        ];


        //only open the modal if a modal isn't open already

        $scope.internalControl.openModal = function(animation) {
          var modalDom = $('.modal-backdrop.active');
          if (modalDom.length >= 1) {
            return;
          }
          $ionicModal.fromTemplateUrl('templates/partials/modal.html', {
            scope: $scope,
            animation: animation,
            backdropClickToClose: false
          }).then(function(modal) {
            $scope.modal = modal;
            $scope.modal.show();
          });
        };
        $scope.internalControl.openModalLong = function(animation) {
          var modalDom = $('.modal-backdrop.active');
          if (modalDom.length >= 1) {
            return;
          }
          $ionicModal.fromTemplateUrl('templates/partials/modal-long.html', {
            scope: $scope,
            animation: animation,
            backdropClickToClose: false
          }).then(function(modal) {
            $scope.modal = modal;
            $scope.modal.show();
          });
        };
        $ionicPlatform.ready(() => {

          $cordovaNativeStorage.getItem('shouldWarnPicker').then((item) => {
            $scope.model = item;
        });
        });


        $scope.closeModal = function() {

          $scope.modal.hide();
          $scope.control.onButtonClick();
          $scope.modal.remove();
        };

        $scope.showCheckMark = function() {
          $cordovaNativeStorage.getItem('shouldWarnPicker').then((item) => {
            if (item) {
              return false;
            } else {
              return true;
            }
          });
        };

        $scope.yesModal = function() {
          $scope.modal.hide();
          $scope.control.onYesButtonClick();
          $scope.modal.remove();
        };
        //Cleanup the modal when we're done with it!
        $scope.$on('$destroy', function() {
          $scope.modal.remove();
        });
        // Execute action on hide modal
        $scope.$on('modal.hidden', function() {
          // Execute action
        });
        // Execute action on remove modal
        $scope.$on('modal.removed', function() {
          // Execute action
        });

      }
    };

  }]);

})();
