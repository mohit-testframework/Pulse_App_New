(function() {
  'use strict';
  pulse.services.factory('$bugreport', function() {

    //default
    var settings =  {
      firstName: '',
      email: '',
      comments: '',
      attachment: false,
    };

    return {

      settings: settings

    };
  });
})();
