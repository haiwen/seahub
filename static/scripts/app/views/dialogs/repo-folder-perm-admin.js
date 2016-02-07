define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'app/collections/repo-user-folder-perm',
    'app/collections/repo-group-folder-perm',
    'app/views/repo-folder-perm'
], function($, _, Backbone, Common, UserFolderPerm, GroupFolderPerm, ItemView) {
    'use strict';

    var View = Backbone.View.extend({

        template: _.template($('#repo-folder-perm-admin-dialog-tmpl').html()),

        initialize: function(options) {
            this.repo_name = options.repo_name;
            this.repo_id = options.repo_id;

            this.render();
            this.$('.op-target').css({'max-width':280}); // for long repo name
            this.$el.modal({
                focus: false
            });
            $("#simplemodal-container").css({
                'width':'auto',
                'height':'auto'
            });
            this.$('.js-tabs').tabs();

            var userPerm = new UserFolderPerm({repo_id: this.repo_id});
            userPerm.perm_type = 'user';
            this.$userPermPanel = this.$('#js-repo-user-folder-perm');

            var groupPerm = new GroupFolderPerm({repo_id: this.repo_id});
            groupPerm.perm_type = 'group';
            this.$groupPermPanel = this.$('#js-repo-group-folder-perm');

            this.renderPanel({
                collection: userPerm,
                $panel: this.$userPermPanel
            });
            this.renderPanel({
                collection: groupPerm,
                $panel: this.$groupPermPanel
            });
        },

        render: function() {
            this.$el.html(this.template({
                title: gettext("{placeholder} Folder Permission")
                    .replace('{placeholder}',
                    '<span class="op-target ellipsis ellipsis-op-target" title="'
                    + Common.HTMLescape(this.repo_name) + '">'
                    + Common.HTMLescape(this.repo_name) + '</span>')
            }));

            return this;
        },

        renderPanel: function(options) {
            var collection = options.collection;
            var $panel = options.$panel;
            var $loadingTip = $('.loading-tip', $panel);
            var $error = $('.error', $panel);

            if (collection.perm_type == 'user') {
                $('[name="emails"]', $panel).select2($.extend({
                    width: '160px'
                },Common.contactInputOptionsForSelect2()));
            } else {
                var groups = app.pageOptions.groups || [];
                var g_opts = '';
                for (var i = 0, len = groups.length; i < len; i++) {
                    g_opts += '<option value="' + groups[i].id + '" data-index="' + i + '">' + groups[i].name + '</option>';
                }
                $('[name="groups"]', $panel).html(g_opts).select2({
                    placeholder: gettext("Select groups"),
                    width: '160px',
                    escapeMarkup: function(m) { return m; }
                });
            }

            // show existing items
            this.listenTo(collection, 'add', this.addItem);
            collection.fetch({
                cache: false,
                success: function(collection, response, opts) {
                    $loadingTip.hide();
                },
                error: function(collection, response, opts) {
                    $loadingTip.hide();
                    if (response.responseText) {
                        if (response['status'] == 401 || response['status'] == 403) {
                            err_msg = gettext("Permission error");
                        } else {
                            err_msg = $.parseJSON(response.responseText).error_msg;
                        }
                    } else {
                        err_msg = gettext('Please check the network.');
                    }
                    $error.html(err_msg).show();
                }
            });
        },

        addItem: function(model, collection, options) {
            var perm_type = collection.perm_type;
            var $panel = perm_type == 'user' ? this.$userPermPanel : this.$groupPermPanel;
            var view = new ItemView({
                model: model,
                repo_id: this.repo_id,
                perm_type: perm_type,
                $error: $('.error', $panel)
            });
            $('tbody', $panel).append(view.render().el);
        }

    });

    return View;
});
