(function() {

  return {
    defaultState: 'loading',

    // Local vars
    projects:         [],
    projectID:        undefined,
    sessionID:        undefined,
    TICKET_JIRA_TAG:  "jira",

    resources: {
      AGILOSOAPSERVICE_URI: "%@/rpc/soap/agilossoapservice-v1",
      ISSUE_URI:            "%@/browse/%@",
      JIRASOAPSERVICE_URI:  "%@/rpc/soap/jirasoapservice-v2",
      LINKS_URI:            "/tickets/%@/external_links.json",
      TICKET_URI:           "/tickets/%@.json?_method=put"
    },

    requests: {
      'addTag':           function(data, url) { return this._postJsonRequest(data, url); },
      'createIssue':      function(data)      { return this._soapRequest(data); },
      'externalLinks':    function(ticketID)  { return { url: helpers.fmt(this.resources.LINKS_URI, ticketID) }; },
      'getAssignees':     function(data)      { return this._soapRequest(data, helpers.fmt(this.resources.AGILOSOAPSERVICE_URI, this.settings.url)); },
      'getIssueTypes':    function(data)      { return this._soapRequest(data); },
      'getProjects':      function(data)      { return this._soapRequest(data); },
      'getSession':       function(data)      { return this._soapRequest(data); },
      'saveExternalLink': function(data, url) { return this._postJsonRequest(data, url); }
    },

    events: {
      'change .submit_form select[name=project_id]':  'changeProject',
      'click .back':                                  'firstLookup',
      'click .submit_form .submit':                   'submitIssue',

      /** Apps Callbacks **/
      'app.activated': 'firstLookup',

      /** Ajax Callbocks **/
      'addTag.done':            'handleAddTagResult',
      'createIssue.done':       'handleCreateIssueResult',
      'externalLinks.done':     'handleExternalLinksResult',
      'getAssignees.done':      'handleGetAssigneesResult',
      'getIssueTypes.done':     'handleGetIssueTypesResult',
      'getProjects.done':       'handleGetProjectsResult',
      'getSession.done':        'handleGetSessionResult',
      'saveExternalLink.done':  'handleSaveExternalLinkResult',

      'addTag.fail':            'handleFailedRequest',
      'createIssue.fail':       'handleFailedRequest',
      'externalLinks.fail':     'handleFailedRequest',
      'getAssignees.fail':      'handleFailedRequest',
      'getIssueTypes.fail':     'handleFailedRequest',
      'getProjects.fail':       'handleFailedRequest',
      'getSession.fail':        'handleFailedRequest',
      'saveExternalLink.fail':  'handleFailedRequest'
    },

    changeProject: function() {
      var form = this.$('.submit_form form'), projectID = form.find('select[name=project_id]').val();

      if ( projectID.length === 0 ) {
        form.find('.submit').prop('disabled', true);
        return;
      }

      // Save data to repopulate when we redraw form
      this.issueTypes = [];
      this.projectID =  projectID;

      this.disableInput(form);
      this.ajax('getIssueTypes', this._xmlTemplateGetIssueTypes(projectID));
    },

    firstLookup: function() { this.ajax('externalLinks', this.ticket().id()); },

    handleAddTagResult: function(data) {
      this.ticket().tags().add(this.TICKET_JIRA_TAG);
    },

    handleCreateIssueResult: function(data) {
      if (this.exceptionOccurred(data)) return;
      var issueID = this.$(data).find('multiRef').children('key').text(), requestData, url;

      requestData = { "external_link": { "type": "JiraIssue", "issue_id": issueID } };
      url = helpers.fmt(this.resources.LINKS_URI, this.ticket().id());
      this.ajax('saveExternalLink', requestData, url);
    },

    handleExternalLinksResult: function(data) {
      var issue = data.find(function(el) { return el.external_link_type === 'JiraIssue'; });

      if (issue) {
        this._renderIssue(issue);
      } else {
        this.ajax('getSession', this._xmlTemplateGetSession());
      }
    },

    handleGetAssigneesResult: function(data) {
      var assignees = this.$(data).find('multiRef'), form, results;

      // Avoid testing result from request, as it's not working for some JIRA configurations and there is an option to 'Allow unassigned issues' in JIRA

      results = this._extractInfo(assignees, ['fullname', 'name']);

      this.switchTo('submitForm', { assignees: this._sortArrayByName(results), issueTypes: this._sortArrayByName(this.issueTypes), projects: this._sortArrayByName(this.projects) });

      form = this.$('.submit_form form');
      this.enableInput(form);
      form.find('select[name=project_id]').val(this.projectID);
    },

    handleGetIssueTypesResult: function(data) {
      var key, sorted, types = this.$(data).find('multiRef');

      if (this.exceptionOccurred(data)) return;

      this.issueTypes = this._extractInfo(types, ['id', 'name']);

      key = this.projects.findProperty('id', this.projectID).key;
      this.ajax('getAssignees', this._xmlTemplateGetAssignees(key));
    },

    handleGetProjectsResult: function(data) {
      var projects = this.$(data).find('multiRef'), sorted;

      this.hideLoader();

      if (this.exceptionOccurred(data)) return;

      this.projects = this._extractInfo(projects, ['id', 'key', 'name']);
      sorted = this._sortArrayByName(this.projects);

      this.switchTo('submitForm', { projects: sorted });
    },

    handleGetSessionResult: function(data) {
      var loginReturn = this.$(data).find('loginReturn');

      if ( loginReturn ) {
        this.sessionID = loginReturn.text();

        this.showMessage(this.I18n.t('login.success'));
        this.showLoader();
        this.ajax('getProjects', this._xmlTemplateGetProjects());
      } else {
        this.showError(this.I18n.t('login.failed'));
      }
    },

    handleSaveExternalLinkResult: function(data) {
      this.showSuccess(this.I18n.t('form.success'));

      // Don't need to show message if this fails
      this.ajax('addTag', { "ticket": { "additional_tags": this.TICKET_JIRA_TAG } }, helpers.fmt(this.resources.TICKET_URI, this.ticket().id()) );
    },

    exceptionOccurred: function(data) {
      var fault = this.$(data).find('faultstring'), message;

      if (fault.length) {
        message = fault.text().replace(/^[^\s]*\s*(.*)/, '$1');
        this.showError(this.I18n.t('exception', { error: message }));
        return true;
      }
      return false;
    },

    submitIssue: function() {
      var form =        this.$('.submit_form form'),
          assigneeID =  form.find('select[name=assignee_id]').val() || '', // Because assignee can be empty, see handleGetAssigneesResult
          issueTypeID = form.find('select[name=issue_type_id]').val(),
          projectID =   form.find('select[name=project_id]').val(),
          projectKey =  this.projects.findProperty('id', projectID).key;

      this.disableInput(form);
      this.ajax('createIssue', this._xmlTemplateCreateIssue({ assigneeID: assigneeID, issueTypeID: issueTypeID, projectKey: projectKey }));
    },

    _extractInfo: function(elements, fields) {
      var self = this, element, hash, results = [];

      elements.each(function(index, el) {
        element = self.$(el);
        hash = {};

        self.$(fields).each(function(key, field) {
          hash[field] = element.children(field).text();
        });
        results.push(hash);
      });

      return results;
    },

    _postJsonRequest: function(data, url) {
      return {
        data: data,
        dataType: "json",
        type: "POST",
        url: url
      };
    },

    _renderIssue: function(issue) {
      var issueID   = issue.external_link.issue_id,
          issueURL  = helpers.fmt(this.resources.ISSUE_URI, this.settings.url, issueID);

      this.switchTo('issue', { issueID: issueID, url: issueURL });
    },

    _soapRequest: function(data, url) {
      url = url || helpers.fmt(this.resources.JIRASOAPSERVICE_URI, this.settings.url);
      return {
        data:         data,
        dataType:     'xml',
        processData:  false,
        type:         'POST',
        url:          url,
        headers:      {
          'SOAPAction': 'login'
        }
      };
    },

    // Receives emberArray, returns jQuery array
    _sortArrayByName: function(emberArray) {
      return emberArray.toArray().sort(function(a, b) {
        return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1;
      });
    },

    _xmlTemplateCreateIssue: function(options) {
      var message = this.renderTemplate('create_issue.xml', {
        xmlnsRoot: helpers.fmt(this.resources.JIRASOAPSERVICE_URI, this.settings.url),
        sessionID: this.sessionID,
        assigneeID: options.assigneeID,
        description: this.ticket().description(),
        projectKey: options.projectKey,
        summary: this.ticket().subject(),
        issueTypeID: options.issueTypeID,
        customFieldID: this.settings.customFieldID,
        ticketID: this.ticket().id()
      });
      return encodeURI( message );
    },

    _xmlTemplateGetAssignees: function(projectKey) {
      var message = this.renderTemplate('get_assignees.xml', {
        xmlnsRoot: helpers.fmt(this.resources.AGILOSOAPSERVICE_URI, this.settings.url),
        url: this.settings.url,
        sessionID: this.sessionID,
        projectKey: projectKey
      });
      return encodeURI( message );
    },

    _xmlTemplateGetIssueTypes: function(projectID) {
      var message = this.renderTemplate('get_issue_types.xml', {
        xmlnsRoot: helpers.fmt(this.resources.JIRASOAPSERVICE_URI, this.settings.url),
        sessionID: this.sessionID,
        projectID: projectID
      });
      return encodeURI( message );
    },

    _xmlTemplateGetProjects: function() {
      var message = this.renderTemplate('get_projects.xml', {
        uri: helpers.fmt(this.resources.JIRASOAPSERVICE_URI, this.settings.url),
        sessionID: this.sessionID
      });
      return encodeURI( message );
    },

    _xmlTemplateGetSession: function() {
      var message = this.rendeTemplate('get_session.xml', {
        xmlnsRoot: helpers.fmt(this.resources.JIRASOAPSERVICE_URI, this.settings.url),
        username: this.settings.username,
        password: this.settings.password
      });
      return encodeURI( message );
    },

    /** Helpers **/
    disableInput: function(form) {
      form.find(':input')
          .prop('disabled', true);
      form.find('a')
          .prop('disabled', true);
    },

    disableSubmit: function(form) {
      var submit = form.find('input[type=submit]');
      submit
        .data('originalValue', submit.val())
        .prop('disabled', true)
        .val(this.I18n.t('global.submitting'));
    },

    enableInput: function(form) {
      form.find(':input')
          .prop('disabled', false);
      form.find('a')
          .prop('disabled', false);
    },

    enableSubmit: function(form) {
      var submit = this.$(form.find('input[type=submit]'));
      submit
        .prop('disabled', false)
        .val(submit.data('originalValue'));
    },

    handleFailedRequest: function(jqXHR, textStatus, errorThrown) { this.showError( this.I18n.t('problem', { error: errorThrown.toString() }) ); },

    hideLoader: function() {
      this.$('.loader').hide();
      this.$('.logo').show();
    },

    showLoader: function() {
      this.$('.logo').hide();
      this.$('.loader').show();
    },

    showError: function(msg) {
      this.switchTo('error', { message: msg });
    },

    showMessage: function(msg) {
      this.switchTo('info', { message: msg });
    },

    showSuccess: function(msg) {
      this.switchTo('success', { message: msg });
    }

  };

}());
