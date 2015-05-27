define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'app/views/share'
], function($, _, Backbone, Common, ShareView) {
    'use strict';

    var RepoView = Backbone.View.extend({
        tagName: 'tr',

        template: _.template($('#repo-tmpl').html()),
        repoDelConfirmTemplate: _.template($('#repo-del-confirm-template').html()),

        events: {
            'mouseenter': 'highlight',
            'mouseleave': 'rmHighlight',
            'click .repo-delete-btn': 'del',
            'click .repo-share-btn': 'share'
        },

        initialize: function() {
        },

        render: function() {
            this.$el.html(this.template(this.model.toJSON()));
            return this;
        },

        // disable 'hover' when 'repo-del-confirm' popup is shown
        highlight: function() {
            if ($('#my-own-repos .repo-del-confirm').length == 0) {
                this.$el.addClass('hl').find('.op-icon').removeClass('vh');
            }
        },

        rmHighlight: function() {
            if ($('#my-own-repos .repo-del-confirm').length == 0) {
                this.$el.removeClass('hl').find('.op-icon').addClass('vh');
            }
        },

        del: function() {
            var del_icon = this.$('.repo-delete-btn');
            var op_container = this.$('.op-container').css({'position': 'relative'});

            var confirm_msg = gettext("Really want to delete {lib_name}?")
                .replace('{lib_name}', '<span class="op-target">' + Common.HTMLescape(this.model.get('name')) + '</span>');
            var confirm_popup = $(this.repoDelConfirmTemplate({
                content: confirm_msg
            }))
            .appendTo(op_container)
            .css({
                'left': del_icon.position().left,
                'top': del_icon.position().top + del_icon.height() + 2,
                'width': 180
            });

            var _this = this;
            $('.no', confirm_popup).click(function() {
                confirm_popup.addClass('hide').remove(); // `addClass('hide')`: to rm cursor
                _this.rmHighlight();
            });
            $('.yes', confirm_popup).click(function() {
                $.ajax({
                    url: Common.getUrl({'name':'repo_del', 'repo_id': _this.model.get('id')}),
                    dataType: 'json',
                    success: function(data) {
                        _this.remove();
                        Common.feedback(gettext("Delete succeeded."), 'success');
                    },
                    error: function(xhr) {
                        confirm_popup.addClass('hide').remove();
                        _this.rmHighlight();

                        var err;
                        if (xhr.responseText) {
                            err = $.parseJSON(xhr.responseText).error;
                        } else {
                            err = gettext("Failed. Please check the network.");
                        }
                        Common.feedback(err, 'error');
                    }
                });
            });
        },

        share: function() {
            var options = {
                'is_repo_owner': true,
                'is_virtual': this.model.get('virtual'),
                'user_perm': 'rw',
                'repo_id': this.model.get('id'),
                'repo_encrypted': this.model.get('encrypted'),
                'is_dir': true,
                'dirent_path': '/',
                'obj_name': this.model.get('name')
            };
            new ShareView(options);
        }

    });

    return RepoView;
});
