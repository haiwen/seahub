define([
    'jquery',
    'underscore',
    'backbone',
    'common'
], function($, _, Backbone, Common) {
    'use strict';

    var GroupRepoView = Backbone.View.extend({
        tagName: 'tr',

        template: _.template($('#group-repo-tmpl').html()),

        events: {
            'mouseenter': 'showAction',
            'mouseleave': 'hideAction',
            'click .cancel-share': 'unshare'
        },

        initialize: function(options) {
            this.group_id = options.group_id;
            Backbone.View.prototype.initialize.apply(this, arguments);

            this.listenTo(this.model, 'destroy', this.remove);
        },

        render: function() {
            var obj = this.model.toJSON();
            $.extend(obj, {
                group_id: this.group_id,
            });
            this.$el.html(this.template(obj));
            return this;
        },

        showAction: function() {
            this.$el.addClass('hl');
            this.$el.find('.op-icon').removeClass('vh');
        },

        hideAction: function() {
            this.$el.removeClass('hl');
            this.$el.find('.op-icon').addClass('vh');
        },

        unshare: function() {
            var that = this;
            var yesCallback = function() {
                Common.closeModal();
                Common.feedback(gettext('Loading...'), 'info', Common.INFO_TIMEOUT); // TODO: what if there is still response after 10 secs ?
                // send delete request and wait response
                that.model.destroy({
                    wait: true,
                    success: function(model, rep) {
                        Common.feedback(gettext('Success'), 'success', Common.SUCCESS_TIMOUT);
                    },
                    error: function() {
                        Common.feedback(gettext('Error'), 'error', Common.ERROR_TIMEOUT);
                    }
                });
            };

            Common.showConfirm(
                gettext('Unshare Library'),
                gettext('Are you sure you want to unshare {placeholder} ?')
                    .replace(/\{placeholder\}/g, '<span class="op-target">' + Common.HTMLescape(this.model.get('name')) + '</span>'),
                yesCallback
            );
        },

    });

    return GroupRepoView;
});
