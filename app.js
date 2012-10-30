(function() {

  return {
    defaultState: 'loading',

    events: {
      'app.activated':              'checkSharedWith',
      'ticket.sharedWith.changed':  'checkSharedWith',

      'fetchProjects.done':         'onProjectsFetched'
    },

    requests: {
      fetchProjects: function(agreementID) {
        return {
          url: helpers.fmt('/sharing_agreements/%@/jira_projects', agreementID)
        };
      }
    },

    checkSharedWith: function() {
      var agreementID = this.sharedWithJiraId();
      if ( agreementID != null ) {
        this.ajax('fetchProjects', agreementID);
      } else {
        this.switchTo('unshared');
      }
    },

    sharedWithJiraId: function() {
      var sharedWith = this.ticket().sharedWith();
      if ( sharedWith == null ||
           sharedWith.length !== 1 ||
           sharedWith[0].partnerName() !== 'jira' ) {
        return null;
      }
      return sharedWith[0].id();
    },

    onProjectsFetched: function(projects) {
      this.projects = projects;
      this.switchTo('share', this);
    }
  };

}());
