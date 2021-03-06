(function(namespace) {

  var views = namespace.views;
  var collections = namespace.collections;
  var models = namespace.models;

  var getTemplate = function(name) {
    return hbs.compile($('#projects-' + name + '-template').html());
  }

  views.Main = Bb.View.extend({
    template: getTemplate('main'),
    initialize: function() {
      var me = this;
      me.render();
    },
    render: function() {
      var me = this;
      var projects = new collections.Projects({});
      projects.addParam('token', window.user.get('token'));
      projects.fetch().done(function() {
        me.$el.html(me.template({
          projects: projects.toJSON()
        }));
      });
      return me;
    }
  });

  views.CreateProject = Bb.View.extend({
    template: getTemplate('create'),
    events: {
      'submit': 'onCreate'
    },
    initialize: function() {
      var me = this;
      me.render();
    },
    render: function() {
      var me = this;
      me.$el.html(me.template({
        token: window.user.get('token')
      }));
      return me;
    },
    onCreate: function(e) {
      e.stopPropagation();
      e.preventDefault();
      var me = this;
      var data = formToJSON(me.$('form'));
      var project = new models.Project(data);
      project.save().done(function(response) {
        Backbone.history.navigate('#projects', {trigger: true}, {replace: true});
      });
    }
  });

  views.Issues = Bb.View.extend({
    template: getTemplate('issues'),
    events: {
      'click .filter': 'onShowFilter'
    },
    initialize: function() {
      var me = this;
      me.render();
    },
    render: function() {
      var me = this;
      var project = new models.Project({
        id: me.options.project
      });
      project.addParam('token', window.user.get('token'));
      project.fetch().done(function() {
        me.$el.html(me.template(project.toJSON()));
        me.onFilter();
      });
      return me;
    },
    onShowFilter: function() {
      var me = this;
      var filterform = me.$('#filter-form');
      if (me.$('#filter-form:visible').size()) {
        filterform.slideUp('fast');
      } else {
        filterform.slideDown('fast');
      }
    },
    onFilter: function() {
      var me = this;

      var news = new collections.Issues();
      news.args.project = me.options.project;
      news.addParams({
        'token': window.user.get('token'),
        'status': 'new,invalid'
      });

      var open = new collections.Issues();
      open.args.project = me.options.project;
      open.addParams({
        'token': window.user.get('token'),
        'status': 'open'
      });

      var onhold = new collections.Issues();
      onhold.args.project = me.options.project;
      onhold.addParams({
        'token': window.user.get('token'),
        'status': 'onhold'
      });

      var resolved = new collections.Issues();
      resolved.args.project = me.options.project;
      resolved.addParams({
        'token': window.user.get('token'),
        'status': 'resolved'
      });

      $.when(
        news.fetch(),
        open.fetch(),
        onhold.fetch(),
        resolved.fetch()
      ).done(function() {
        new views.IssuesList({
          el: me.$('.new-list'),
          issues: {
            'new': news.toJSON(),
            'open': open.toJSON(),
            'onhold': onhold.toJSON(),
            'resolved': resolved.toJSON()
          }
        });
      });
    }
  });

  views.IssuesList = Bb.View.extend({
    template: getTemplate('issues-list'),
    initialize: function() {
      var me = this;
      me.render();
    },
    render: function() {
      var me = this;
      me.$el.html(me.template({
        issues: me.options.issues
      }));
      me.setDragAndDrop();
      return me;
    },
    setDragAndDrop: function() {
      var me = this;
      
      $('.list ul .issue').draggable({
        appendTo: 'parent',
        helper: 'clone',
        snap: true,
        handle: '.task-title'
      });

      $('.list ul').droppable({
        accept: '.issue',
        drop: function(e, ui) {
          var taskClone = ui.draggable.clone();
          var flag = false;
          if($(this).children('#' + taskClone.attr('id')).size() == 0) {
            taskClone.prependTo(this);
            flag = true;
          }
          taskClone.draggable({
            appendTo: 'parent',
            helper: 'clone',
            snap: true,
            handle: '.task-title'
          });
          var list = $(this).closest('.list').attr('id');



          if(list == 'new') {
            if (taskClone.data('status') == 'invalid') {
              taskClone.addClass('invalid');
            } else {
              if (taskClone.data('status') == 'onhold' && list == 'new') {
                taskClone.addClass('invalid');
                list = 'invalid';
              }
            }
          } else {
            taskClone.removeClass('invalid');
          }
          
          var issue = new models.Issue({
            id: taskClone.attr('id'),
            responsable: taskClone.data('responsable'),
            status: list
          });

          issue.args.project = taskClone.data('project');

          issue.save().done(function(response) {
            taskClone.find('.responsable').text(response.responsable);
            taskClone.attr('data-status', list);
          });
          
          if(flag) {
            ui.draggable.remove();
          }
        }
      });
    }
  });

  views.CreateIssue = Bb.View.extend({
    template: getTemplate('create-issue'),
    events: {
      'submit': 'onCreate'
    },
    initialize: function() {
      var me = this;
      me.render();
    },
    render: function() {
      var me = this;
      var project = new models.Project({
        id: me.options.project
      });
      project.addParam('token', window.user.get('token'));
      project.fetch().done(function() {
        me.$el.html(me.template(project.toJSON()));
      });
      return me;
    },
    onCreate: function(e) {
      e.stopPropagation();
      e.preventDefault();
      var me = this;
      var data = formToJSON(me.$('form'));
      data['token'] = window.user.get('token');
      var issue = new models.Issue(data);
      issue.args.project = me.options.project;
      issue.save().done(function() {
        Backbone.history.navigate('#projects/' + me.options.project, {trigger: true}, {replace: true});
      });
      return false;
    }
  });

  views.Settings = Bb.View.extend({
    template: getTemplate('settings'),
    events: {
      'click .module-btn': 'onOpenParamsList',
    },
    initialize: function() {
      var me = this;
      me.render();
    },
    render: function() {
      var me = this;
      me.model = new models.Project({
        id: me.options.project
      });
      me.model.addParam('token', window.user.get('token'));
      me.model.fetch().done(function() {
        me.$el.html(me.template(me.model.toJSON()));
      });
      return me;
    },
    onOpenParamsList: function(e) {
      var me = this;
      if (me.$('.active')) {
        me.$('.active').removeClass('active');
      }
      var target = me.$(e.currentTarget);
      target.closest('li').addClass('active');
      me.$('.local-container').off();
      new views.ParamsList({
        model: me.model,
        type: target.data('type'),
        el: me.$('.local-container')
      });
    }
  });

  views.ParamsList = Bb.View.extend({
    template: getTemplate('params-list'),
    events: {
      'click .create': 'onCreate',
      'click .edit': 'onUpdate',
      'click .delete': 'onDestroy'
    },
    initialize: function() {
      var me = this;
      me.model.set('list', me.model.get(me.options.type.toLowerCase()));
      me.render();
    },
    render: function() {
      var me = this;
      me.$el.html(me.template(me.model.toJSON()));
      return me;
    },
    onCreate: function(e) {
      var me = this;
      var name = prompt(__('Provide a name'));
      if (name == null) return false;
      var model = new models[me.options.type.substring(0, me.options.type.length - 1)]({
        name: name,
        token: window.user.get('token')
      });
      model.args.project = me.model.get('_id');
      model.save().done(function(response) {
        me.model.get(me.options.type.toLowerCase()).push(response);
        me.initialize();
      });
    },
    onUpdate: function(e) {
      var me = this;
      var target = me.$(e.currentTarget);
      var name = prompt(__('Provide a new name'));
      if (name == null) return false;
      var model = new models[me.options.type.substring(0, me.options.type.length - 1)]({
        name: name,
        token: window.user.get('token'),
        id: target.data('id')
      });
      model.args.project = me.model.get('_id');
      model.save().done(function(response) {
        var list = me.model.get(me.options.type.toLowerCase());
        for(var i in list) {
          if (target.data('id') == list[i]._id) {
            list[i].name = name;
          }
        }
        me.initialize();
      });
    },
    onDestroy: function(e) {
      var me = this;
      var target = me.$(e.currentTarget);
      var model = new models[me.options.type.substring(0, me.options.type.length - 1)]({
        id: target.data('id')
      });
      model.args.project = me.model.get('_id');
      model.addParam('token', window.user.get('token'));
      model.destroy().done(function(response) {
        var list = me.model.get(me.options.type.toLowerCase());
        for(var i in list) {
          if (target.data('id') == list[i]._id) {
            list.splice(i, 1);
          }
        }
        me.initialize();
      });
    }
  });

})(projects);