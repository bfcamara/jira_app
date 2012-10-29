(function() {

  return {
    defaultState: 'loading',

    events: {
      'app.activated': 'onActivated'
    },

    onActivated: function() {
      this.switchTo('unshared');
    }
  };

}());
