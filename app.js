(function() {

  var DETAILS_URL     = '/api/v2/tickets/%@/jira.json',
      PROJECTS_URL    = '/sharing_agreements/%@/jira_projects',
      OPTION_TEMPLATE = '<option value="%@">%@</option>';

  // Data object for the list of available projects
  function Projects(app, agreementID) {
    var self = this;
    this.app = app;
    this._projectOptions = [];
    this._issueTypeOptions = {};
    app.ajax('fetchProjects', agreementID);
  }

  Projects.prototype = {
    setData: function(projects) {
      this._projectOptions = _.map(projects, function(p) {
        return { value: p.id, text: p.name };
      });

      this._issueTypeOptions = _.inject(projects, function(memo, p) {
        memo[ p.id ] = _.map(p.issueTypes, function(it) {
          return { value: it.id, text: it.name };
        });
        return memo;
      }, {});
    },

    chooseProject: function(projectID) {
      this.selectedProjectID = projectID;
    },

    projectOptions: function() { return this._projectOptions; },

    issueTypeOptions: function() {
      return this._issueTypeOptions[ this.selectedProjectID ] || [];
    }
  };

  return {

    defaultState: 'loading',

    events: {
      'app.activated %loading':           'checkAlreadyShared',
      'ticket.sharedWith.changed':        'checkSharingWith',

      'fetchDetails.done':                'onDetailsFetched',
      'fetchDetails.fail':                'checkSharingWith',
      'fetchProjects.done':               'onProjectsFetched',
      'change select[name="project_id"]': 'onProjectSelected',
      'change input,select':              'onSharingInfoChanged'
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
      this.ajax('fetchDetails', this.ticket().id());
    },

    onDetailsFetched: function(results) {
      var details = this._parseDetails(results);
      if (details) {
        this.switchTo('details', details);
      } else {
        this.switchTo('unshared');
      }
    },

    checkSharingWith: function() {
      var agreementID = this.sharedWithJiraId();
      if ( agreementID != null && this.currentState != 'loading' && this.currentState != 'details' ) {
        this.projects = new Projects(this, agreementID);
        this.switchTo('fetchingProjects');
        services.appsTray().show();
        this.highlightApp(true);
      } else if (agreementID === null && this.currentState == 'loading' || this.currentState == 'share') {
        this.switchTo('unshared');
        this.highlightApp(false);
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
      this.projects.setData(projects);
      this.switchTo('share', this);
    },

    onProjectSelected: function(e) {
      this.projects.chooseProject( this.$(e.target).val() );
      this.$('select[name="issue_type_id"]').replaceWith(
        this.issueTypesSelect().toString()
      );
    },

    onSharingInfoChanged: function(e) {
      var sharingOptions = this.ticket().sharingAgreementOptions() || {},
          $e = this.$(e.target);
      sharingOptions[ $e.attr('name') ] = $e.val();
      this.ticket().sharingAgreementOptions( sharingOptions );
    },

    _parseDetails: function(results) {
      if (results && results.length === 1) {
        var details = results[0];
        details.ASSIGNEE   = details.ASSIGNEE   || this.I18n.t('details.assignee.none');
        details.RESOLUTION = details.RESOLUTION || this.I18n.t('details.status.none');
        return details;
      }
      return null;
    },

    // Returns the list of projects as a <select>
    projectsSelect: function() {
      var prompt = this.I18n.t('share.project.prompt');
      return this.renderSelect('project_id', prompt, this.projects.projectOptions());
    },

    // Returns the list of issue types as a <select>
    issueTypesSelect: function() {
      var prompt = this.I18n.t('share.story_type.prompt');
      return this.renderSelect('issue_type_id', prompt, this.projects.issueTypeOptions());
    },

    renderSelect: function(name, prompt, options) {
      return helpers.safeString(this.renderTemplate('select', {
        name: name,
        options: [ { value: "", text: prompt } ].concat(options)
      }));
    },

    highlightApp: function(status) {
      var self = this,
          elem = self.$("section");

      if (status === true) {
        elem.addClass('highlight');
        setTimeout(function() { self.highlightApp(false); }, 3000);
      } else {
        elem.removeClass('highlight');
      }
    }
  };

}());
