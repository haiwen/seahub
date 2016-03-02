define([
    'jquery',
    'underscore',
    'backbone',
    'common'
], function($, _, Backbone, Common) {
    'use strict';

    var View = Backbone.View.extend({
        tagName: 'tr',

        template: _.template($('#repo-folder-perm-item-tmpl').html()),

        events: {
            'mouseenter': 'highlight',
            'mouseleave': 'rmHighlight',
            'click .edit-icon': 'showEdit',
            'change .perm-toggle-select': 'edit',
            'click .rm': 'rm'
        },

        initialize: function(options) {
            this.data = {};
            $.extend(this.data, options);

            this.listenTo(this.model, 'change', this.render);
        },

        render: function() {
            var obj = {}; 

            $.extend(obj, this.model.attributes, {
                'perm_type': this.data.perm_type, 
                'repo_id': this.data.repo_id,
                'encoded_path': Common.encodePath(this.model.get('folder_path'))
            });

            this.$el.html(this.template(obj));
            return this;
        },

        highlight: function() {
            this.$el.addClass('hl').find('.op-icon').removeClass('vh');
        },

        rmHighlight: function() {
            this.$el.removeClass('hl').find('.op-icon').addClass('vh');
        },

        showEdit: function(e) {
            var $td = $(e.currentTarget).closest('td');
            $('.cur-perm, .edit-icon', $td).hide();
            $('.perm-toggle-select', $td).show();
        },

        edit: function(e) {
            var url = Common.getUrl({
                name: this.data.perm_type == 'user' ? 'repo_user_folder_perm' : 'repo_group_folder_perm',
                repo_id: this.data.repo_id
            });

            var new_perm = $(e.currentTarget).val();
            var post_data = {
                'folder_path': this.model.get('folder_path'),
                'permission': new_perm 
            };
            if (this.data.perm_type == 'user') {
                $.extend(post_data, {
                    'user_email': this.model.get('user_email')
                });
            } else {
                $.extend(post_data, {
                    'group_id': this.model.get('group_id')
                });
            }

            var _this = this;
            $.ajax({
                url: url,
                type: 'put',
                dataType: 'json',
                beforeSend: Common.prepareCSRFToken,
                data: post_data,
                success: function() {
                    _this.model.set({'permission': new_perm});
                },
                error: function(xhr) {
                    var err_msg;
                    if (xhr.responseText) {
                        err_msg = $.parseJSON(response.responseText).error_msg;
                    } else {
                        err_msg = gettext('Please check the network.');
                    }
                    _this.data.$error.html(err_msg).show();
                }
            });
        },

        rm: function() {
            var url = Common.getUrl({
                name: this.data.perm_type == 'user' ? 'repo_user_folder_perm' : 'repo_group_folder_perm',
                repo_id: this.data.repo_id
            });
            var post_data = {
                'folder_path': this.model.get('folder_path')
            };
            if (this.data.perm_type == 'user') {
                $.extend(post_data, {
                    'user_email': this.model.get('user_email')
                });
            } else {
                $.extend(post_data, {
                    'group_id': this.model.get('group_id')
                });
            }

            var _this = this;
            $.ajax({
                url: url,
                type: 'delete',
                dataType: 'json',
                beforeSend: Common.prepareCSRFToken,
                data: post_data,
                success: function() {
                    _this.remove();
                },
                error: function(xhr) {
                    var err_msg;
                    if (xhr.responseText) {
                        err_msg = $.parseJSON(response.responseText).error_msg;
                    } else {
                        err_msg = gettext('Please check the network.');
                    }
                    _this.data.$error.html(err_msg).show();
                }
            });
        }

    });

    return View;
});
