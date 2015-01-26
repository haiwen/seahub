define([
  'jquery',
  'underscore',
  'backbone',
  'common',
  'file-tree',
  'app/collections/dirents',
  'app/views/dirents',
  'text!' + app.config._tmplRoot + 'dir-op-bar.html',
  'text!' + app.config._tmplRoot + 'path-bar.html',
  ], function($, _, Backbone, Common, FileTree, DirentCollection, DirentView,
    DirOpBarTemplate, PathBarTemplate) {
    'use strict';

    var DirView = Backbone.View.extend({
      el: $('#dir-view'),
      path_bar_template: _.template(PathBarTemplate),
      dir_op_bar_template: _.template(DirOpBarTemplate),

      initialize: function(options) {
        this.$dirent_list = this.$('.repo-file-list tbody');
        this.$path_bar = this.$('.path');
        // For compatible with css, we use .repo-op instead of .dir-op
        this.$dir_op_bar = this.$('.repo-op');

        this.dir = new DirentCollection();
        this.listenTo(this.dir, 'add', this.addOne);
        this.listenTo(this.dir, 'reset', this.reset);

        // initialize common js behavior
        $('th .checkbox-orig').unbind();

      },

      showDir: function(repo_id, path) {
        console.log("showDir " + repo_id + " " + path);
        this.repo_id = repo_id;
        this.path = path;
        this.dir.setPath(repo_id, path);
        this.dir.fetch({reset: true});
        this.$el.show();

      },

      hide: function() {
        this.$el.hide();
      },

      addOne: function(dirent) {
        var view = new DirentView({model: dirent, dirView: this});
        this.$dirent_list.append(view.render().el);
      },

      reset: function() {
        this.$dirent_list.empty();
        this.dir.each(this.addOne, this);
        this.renderPath();
        this.renderDirOpBar();
      },

      renderPath: function() {
        var dir = this.dir;
        var path = dir.path,
        obj = {
          path: path,
          repo_name: dir.repo_name,
        };
        if (path != '/') {
          $.extend(obj, {
            path_list: path.substr(1).split('/'),
            repo_id: dir.repo_id,
          });
        }
        this.$path_bar.html(this.path_bar_template(obj));
      },

      renderDirOpBar: function() {
        var dir = this.dir;
        var user_perm = dir.user_perm;
        this.$dir_op_bar.html($.trim(this.dir_op_bar_template({
          user_perm: user_perm,
          encrypted: dir.encrypted,
          path: dir.path,
          repo_id: dir.repo_id,
        })));
      },

      // Directory Operations
      events: {
        'click .path-link': 'visitDir',
        'click #upload-file': 'uploadFile',
        'click #add-new-dir': 'newDir',
        'click #add-new-file': 'newFile',
        'click #share-cur-dir': 'share',
        'click th.select': 'select',
        'click #by-name': 'sortByName',
        'click #by-time': 'sortByTime',
        'click #del-dirents': 'delete',
        'click #mv-dirents': 'mv',
        'click #cp-dirents': 'cp'
      },

      newDir: function() {
        var form = $('#add-new-dir-form'),
        form_id = form.attr('id');
        form.modal({appendTo:'#main'});
        $('#simplemodal-container').css({'height':'auto'});
        var dir = this.dir;
        var dirView = this;
        form.submit(function() {
          var dirent_name = $.trim($('input[name="name"]', form).val());
          if (!dirent_name) {
            //apply_form_error(form_id, "{% trans "It is required." %}");
            //apply_form_error(form_id, "It is required.");
            return false;
          }
          var post_data = {'dirent_name': dirent_name};
          var post_url = Common.getUrl({name: "new_dir", repo_id: dir.repo_id})
            + '?parent_dir=' + encodeURIComponent(dir.path);
          var after_op_success = function(data) {
            $.modal.close();
            var now = new Date().getTime()/1000;
            var new_dirent = dir.add({
              'is_dir': true,
              'obj_name': data['name'],
              'last_modified': now,
              //'last_update': "{% trans "Just now" %}",
              'last_update': "Just now",
              'p_dpath': data['p_dpath'],
            }, {silent:true});
            var view = new DirentView({model: new_dirent, dirView: dirView});
            $('tr:first', dirView.$dirent_list).before(view.render().el); // put the new dir as the first one
          };
          Common.ajaxPost({
            'form': form,
            'post_url': post_url,
            'post_data': post_data,
            'after_op_success': after_op_success,
            'form_id': form_id
          });
          return false;
        });
      },

    });

    return DirView;
});
