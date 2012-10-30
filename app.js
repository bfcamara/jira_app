(function() {

  return {
    defaultState: 'loading',

    events: {
      'app.activated':                    'checkSharedWith',
      'ticket.sharedWith.changed':        'checkSharedWith',

      'fetchProjects.done':               'onProjectsFetched',
      'change select[name="project_id"]': 'onProjectSelected'
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
    }
  };

}());
