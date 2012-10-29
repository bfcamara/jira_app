(function() {

  return {
    defaultState: 'loading',

    events: {
      'app.activated':              'checkSharedWith',
      'ticket.sharedWith.changed':  'checkSharedWith'
    },

    checkSharedWith: function() {
      if ( this.sharedWithJIRA() ) {
        this.switchTo('share');
      } else {
        this.switchTo('unshared');
      }
    },

    sharedWithJIRA: function() {
      var sharedWith = this.ticket().sharedWith();
      return sharedWith !== null &&
             sharedWith.length === 1 &&
             sharedWith[0].partnerName() === 'jira';
    }
  };

}());
