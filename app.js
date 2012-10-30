(function() {

  var DETAILS_URL  = '/tickets/%@/jira_ticket_details',
      PROJECTS_URL = '/sharing_agreements/%@/jira_projects';

  return {
    defaultState: 'loading',

    events: {
      'app.activated %loading':           'checkAlreadyShared',
      'ticket.sharedWith.changed':        'checkSharingWith',

      'fetchDetails.done':                'onDetailsFetched',
      'fetchDetails.fail':                'checkSharingWith',
      'fetchProjects.done':               'onProjectsFetched',
      'change select[name="project_id"]': 'onProjectSelected'
    },

    requests: {
      fetchDetails: function(ticketID) {
        return {
          url: helpers.fmt(DETAILS_URL, ticketID)
        };
      },

      fetchProjects: function(agreementID) {
        return {
          url: helpers.fmt(PROJECTS_URL, agreementID)
        };
      }
    },

    checkAlreadyShared: function() {
      this.ajax( 'fetchDetails', this.ticket().id() );
    },

    onDetailsFetched: function(results) {
      var details = this._parseDetails(results);
      if ( details != null ) { this.switchTo('details', details); }
      else { this.checkSharingWith(); }
    },

    checkSharingWith: function() {
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
    },

    onProjectSelected: function(e) {
      this.selectedProjectID = this.$(e.target).val();
      this.$('select[name="story_type_id"]')
          .html( '' + this.storyTypeOptions() );
    },

    storyTypesForCurrentProject: function() {
      if ( this.projects == null || this.selectedProjectID == null ) {
        return [];
      }
      var project = _.find(this.projects, function(p) {
        return p.id === this.selectedProjectID;
      }, this);
      return project == null ? [] : project.issueTypes;
    },

    storyTypeOptions: function() {
      // This should really be a template, but Lotus's current version of
      // Handlebars (1.0.beta.2) can't render templates that end in
      // {{#foos}}...{{/foos}} blocks. As soon as Lotus upgrades to Ember 1.0,
      // it can upgrade Handlebars, and we can replace this with a template.
      var optionTemplate = '<option value="%@">%@</option>',
          result = '';
      result += helpers.fmt(optionTemplate, '', this.I18n.t('share.story_type.prompt'));
      this.storyTypesForCurrentProject().forEach(function(type) {
        result += helpers.fmt(optionTemplate, type.id, type.name);
      });
      return helpers.safeString( result );
    },

    _parseDetails: function(results) {
      if (results && results.length === 1) {
        var details = results[0];
        details.ASSIGNEE   = details.ASSIGNEE   || this.I18n.t('details.assignee.none');
        details.RESOLUTION = details.RESOLUTION || this.I18n.t('details.status.none');
        return details;
      }
      return null;
    }
  };

}());
