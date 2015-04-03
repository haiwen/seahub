define([
    'jquery',
    'underscore',
    'backbone',
    'common'
], function($, _, Backbone, Common) {
    'use strict';

    var RepoView = Backbone.View.extend({
        tagName: 'tr',

        template: _.template($('#sub-lib-tmpl').html()),
        repoDelConfirmTemplate: _.template($('#repo-del-confirm-template').html()),

        events: {
            'mouseenter': 'highlight',
            'mouseleave': 'rmHighlight',
            'click .repo-delete-btn': 'del'
        },

        initialize: function() {
        },

        render: function() {
            this.$el.html(this.template(this.model.toJSON()));
            return this;
        },

        // disable 'hover' when 'repo-del-confirm' popup is shown
        highlight: function() {
            if ($('#my-sub-repos .repo-del-confirm').length == 0) {
                this.$el.addClass('hl').find('.op-icon').removeClass('vh');
            }
        },

        rmHighlight: function() {
            if ($('#my-sub-repos .repo-del-confirm').length == 0) {
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
        }

    });

    return RepoView;
});
