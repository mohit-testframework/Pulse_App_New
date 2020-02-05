(function() {
  'use strict';
  pulse.services.factory('$presetData', function() {

    return {
      loadedPresets : {
        '☁️ Clouds' : {
          duration: {
            hours: 1,
            minutes: 30
          },
          interval: 10
        },
        '👯 People':{
          duration:{
            hours: 0,
            minutes: 30
          },
          interval: 3
        },
        '🏙 Cityscape':{
          duration:{
            hours: 0,
            minutes: 40
          },
          interval: 5
        },
          '🏔Landscape':{
            duration:{
              hours: 2,
              minutes: 0
            },
            interval: 15
          },
          '🌠 Stars':{
            duration:{
              hours: 4,
              minutes: 0
            },
            interval: 40
          }
        }
      }

  });
})();
