(function() {

  return ZendeskApps.defineApp(ZendeskApps.Site.TICKET_SIDEBAR, {
    appID: '/apps/01-jira/versions/1.0.0',

    defaultState: 'loading',

    dependencies: {
      currentTicketDescription: 'ticket.description',
      currentTicketID:          'ticket.id',
      currentTicketSubject:     'ticket.subject'
    },

    // Local vars
    projects:   [],
    projectID:  undefined,
    sessionID:  undefined,

    resources: {
      AGILOSOAPSERVICE_URI: "%@/rpc/soap/agilossoapservice-v1",
      ISSUE_URI:            "%@/browse/%@",
      JIRASOAPSERVICE_URI:  "%@/rpc/soap/jirasoapservice-v2",
      LINKS_URI:            "/tickets/%@/external_links.json",
      TICKET_URI:           "/tickets/%@.json?_method=put"
    },

    xmlTemplates: {
      CREATE_ISSUE:     '<?xml version="1.0" encoding="ISO-8859-1"?>' +
                        '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:soapenc="http://schemas.xmlsoap.org/soap/encoding/"' +
                        '    xmlns:tns="%@1" xmlns:types="%@1/encodedTypes" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">' +
                        '  <soap:Body soap:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">' +
                        '    <q1:createIssue xmlns:q1="http://soap.rpc.jira.atlassian.com">' +
                        '      <in0 xsi:type="xsd:string">%@2</in0>' +
                        '      <in1 href="#id1" />' +
                        '    </q1:createIssue>' +
                        '    <q2:RemoteIssue id="id1" xsi:type="q2:RemoteIssue" xmlns:q2="http://beans.soap.rpc.jira.atlassian.com">' +
                        '      <id xsi:nil="true" />' +
                        '      <affectsVersions xsi:nil="true" />' +
                        '      <assignee xsi:type="xsd:string">%@3</assignee>' +
                        '      <attachmentNames xsi:nil="true" />' +
                        '      <components xsi:nil="true" />' +
                        '      <created xsi:nil="true" />' +
                        '      <customFieldValues xsi:nil="true" />' +
                        '      <description><![CDATA[%@4]]></description>' +
                        '      <duedate xsi:nil="true" />' +
                        '      <environment xsi:nil="true" />' +
                        '      <fixVersions xsi:nil="true" />' +
                        '      <key xsi:nil="true" />' +
                        '      <priority xsi:nil="true" />' +
                        '      <project xsi:type="xsd:string">%@5</project>' +
                        '      <reporter xsi:nil="true" />' +
                        '      <resolution xsi:nil="true" />' +
                        '      <status xsi:nil="true" />' +
                        '      <summary xsi:type="xsd:string"><![CDATA[%@6]]></summary>' +
                        '      <type xsi:type="xsd:string">%@7</type>' +
                        '      <updated xsi:nil="true" />' +
                        '      <votes xsi:nil="true" />' +
                        '      <customFieldValues href="#id2" />' +
                        '    </q2:RemoteIssue>' +
                        '    <soapenc:Array id="id2" xmlns:q3="http://beans.soap.rpc.jira.atlassian.com" soapenc:arrayType="q3:RemoteCustomFieldValue[1]">' +
                        '      <Item href="#id3" />' +
                        '    </soapenc:Array>' +
                        '    <q4:RemoteCustomFieldValue id="id3" xsi:type="q4:RemoteCustomFieldValue" xmlns:q4="http://beans.soap.rpc.jira.atlassian.com">' +
                        '      <customfieldId xsi:type="xsd:string">customfield_%@8</customfieldId>' +
                        '      <key xsi:nil="true" />' +
                        '      <values href="#id4" />' +
                        '    </q4:RemoteCustomFieldValue>' +
                        '    <soapenc:Array id="id4" soapenc:arrayType="xsd:string[1]">' +
                        '      <Item>%@9</Item>' +
                        '    </soapenc:Array>' +
                        '  </soap:Body>' +
                        '</soap:Envelope>',
      GET_ASSIGNEES:    '<?xml version="1.0" encoding="utf-8"?>' +
                        '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:soapenc="http://schemas.xmlsoap.org/soap/encoding/"' +
                        '    xmlns:tns="%@1" xmlns:types="%@1/encodedTypes" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">' +
                        '  <soap:Body soap:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">' +
                        '    <q1:getAssignableUsers xmlns:q1="%@4">' +
                        '      <in0 xsi:type="xsd:string">%@2</in0>' +
                        '      <in1 xsi:type="xsd:string">%@3</in1>' +
                        '    </q1:getAssignableUsers>' +
                        '  </soap:Body>' +
                        '</soap:Envelope>',
      GET_ISSUE_TYPES:  '<?xml version="1.0" encoding="utf-8"?>' +
                        '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:soapenc="http://schemas.xmlsoap.org/soap/encoding/"' +
                        '    xmlns:tns="%@1" xmlns:types="%@1/encodedTypes" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">' +
                        '<soap:Body soap:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">' +
                        '<q1:getIssueTypesForProject xmlns:q1="http://soap.rpc.jira.atlassian.com">' +
                        '<in0 xsi:type="xsd:string">%@2</in0>' +
                        '<in1 xsi:type="xsd:string">%@3</in1>' +
                        '</q1:getIssueTypesForProject>' +
                        '</soap:Body>' +
                        '</soap:Envelope>',
      GET_PROJECTS:     '<?xml version="1.0" encoding="UTF-8"?>' +
                        '<SOAP-ENV:Envelope xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"' +
                        '    xmlns:SOAP-ENC="http://schemas.xmlsoap.org/soap/encoding/" SOAP-ENV:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/"' +
                        '    xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/">' +
                        '  <SOAP-ENV:Body>' +
                        '    <m:getProjectsNoSchemes xmlns:m="%@">' +
                        '      <in0 xsi:type="xsd:string">%@</in0>' +
                        '    </m:getProjectsNoSchemes>' +
                        '  </SOAP-ENV:Body>' +
                        '</SOAP-ENV:Envelope>',
      GET_SESSION:      '<?xml version="1.0" encoding="utf-8"?>' +
                        '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:soapenc="http://schemas.xmlsoap.org/soap/encoding/"' +
                        '    xmlns:tns="%@1" xmlns:types="%@1/encodedTypes" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">' +
                        '  <soap:Body soap:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">' +
                        '    <q1:login xmlns:q1="http://soap.rpc.jira.atlassian.com">' +
                        '      <in0 xsi:type="xsd:string">%@2</in0>' +
                        '      <in1 xsi:type="xsd:string"><![CDATA[%@3]]></in1>' +
                        '    </q1:login>' +
                        '  </soap:Body>' +
                        '</soap:Envelope>'
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
      'currentTicketID.changed': 'firstLookup',

      /** Ajax Callbocks **/
      'addTag':                   'handleAddTagResult',
      'createIssue.done':      'handleCreateIssueResult',
      'externalLinks.done':    'handleExternalLinksResult',
      'getAssignees.done':     'handleGetAssigneesResult',
      'getIssueTypes.done':    'handleGetIssueTypesResult',
      'getProjects.done':      'handleGetProjectsResult',
      'getSession.done':       'handleGetSessionResult',
      'saveExternalLink.done': 'handleSaveExternalLinkResult',

      'createIssue.fail':      'handleFailedRequest',
      'externalLinks.fail':    'handleFailedRequest',
      'getAssignees.fail':     'handleFailedRequest',
      'getIssueTypes.fail':    'handleFailedRequest',
      'getProjects.fail':      'handleFailedRequest',
      'getSession.fail':       'handleFailedRequest',
      'saveExternalLink.fail': 'handleFailedRequest'
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

    firstLookup: function() { this.ajax('externalLinks', this.dependency('currentTicketID')); },

    handleAddTagResult: function() {
      // Find way to show added tag to currently displayed ticket
    },

    handleCreateIssueResult: function(e, data) {
      if (this.exceptionOccurred(data)) return;
      var issueID = this.$(data).find('multiRef').children('key').text(), requestData, url;

      requestData = { "external_link": { "type": "JiraIssue", "issue_id": issueID } };
      url = helpers.fmt(this.resources.LINKS_URI, this.dependency('currentTicketID'));
      this.ajax('saveExternalLink', requestData, url);
    },

    handleExternalLinksResult: function(e, data) {
      var issue = data.find(function(el) { return el.external_link_type === 'JiraIssue'; });

      if (issue) {
        this._renderIssue(issue);
      } else {
        this.ajax('getSession', this._xmlTemplateGetSession());
      }
    },

    handleGetAssigneesResult: function(e, data) {
      var assignees = this.$(data).find('multiRef'), form, results;

      // Avoid testing result from request, as it's not working for some JIRA configurations and there is an option to 'Allow unassigned issues' in JIRA

      results = this._extractInfo(assignees, ['fullname', 'name']);

      this.switchTo('submitForm', { assignees: this._sortArrayByName(results), issueTypes: this._sortArrayByName(this.issueTypes), projects: this._sortArrayByName(this.projects) });

      form = this.$('.submit_form form');
      this.enableInput(form);
      form.find('select[name=project_id]').val(this.projectID);
    },

    handleGetIssueTypesResult: function(e, data) {
      var key, sorted, types = this.$(data).find('multiRef');

      if (this.exceptionOccurred(data)) return;

      this.issueTypes = this._extractInfo(types, ['id', 'name']);

      key = this.projects.findProperty('id', this.projectID).key;
      this.ajax('getAssignees', this._xmlTemplateGetAssignees(key));
    },

    handleGetProjectsResult: function(e, data) {
      var projects = this.$(data).find('multiRef'), sorted;

      this.hideLoader();

      if (this.exceptionOccurred(data)) return;

      this.projects = this._extractInfo(projects, ['id', 'key', 'name']);
      sorted = this._sortArrayByName(this.projects);

      this.switchTo('submitForm', { projects: sorted });
    },

    handleGetSessionResult: function(e, data) {
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

    handleSaveExternalLinkResult: function(e, data) {
      this.showSuccess(this.I18n.t('form.success'));

      // Don't need to show message if this fails
      this.ajax('addTag', { "ticket": { "additional_tags": "jira" } }, helpers.fmt(this.resources.TICKET_URI, this.dependency('currentTicketID')) );
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
      return encodeURI( 
        helpers.fmt(
          this.xmlTemplates.CREATE_ISSUE,
          helpers.fmt(this.resources.JIRASOAPSERVICE_URI, this.settings.url),
          this.sessionID,
          options.assigneeID,
          this.dependency('currentTicketDescription'),
          options.projectKey,
          this.dependency('currentTicketSubject'),
          options.issueTypeID,
          this.settings.customFieldID,
          this.currentTicketID
        )
      );
    },

    _xmlTemplateGetAssignees: function(projectKey) {
      return encodeURI( helpers.fmt(this.xmlTemplates.GET_ASSIGNEES, helpers.fmt(this.resources.AGILOSOAPSERVICE_URI, this.settings.url), this.sessionID, projectKey, this.settings.url) );
    },

    _xmlTemplateGetIssueTypes: function(projectID) {
      return encodeURI( helpers.fmt(this.xmlTemplates.GET_ISSUE_TYPES, helpers.fmt(this.resources.JIRASOAPSERVICE_URI, this.settings.url), this.sessionID, projectID) );
    },

    _xmlTemplateGetProjects: function() {
      return encodeURI( helpers.fmt(this.xmlTemplates.GET_PROJECTS, helpers.fmt(this.resources.JIRASOAPSERVICE_URI, this.settings.url), this.sessionID) );
    },

    _xmlTemplateGetSession: function() {
      return encodeURI( helpers.fmt(this.xmlTemplates.GET_SESSION, helpers.fmt(this.resources.JIRASOAPSERVICE_URI, this.settings.url), this.settings.username, this.settings.password) );
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

    handleFailedRequest: function(event, jqXHR, textStatus, errorThrown) { this.showError( this.I18n.t('problem', { error: errorThrown.toString() }) ); },

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

  });

}());
