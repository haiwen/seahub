define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'text!' + app.config._tmplRoot + 'group-repos.html'
], function($, _, Backbone, Common, reposTemplate) {
    'use strict';

    var GroupRepoView = Backbone.View.extend({
        tagName: 'tr',

        template: _.template(reposTemplate),

        events: {
            'mouseenter': 'showAction',
            'mouseleave': 'hideAction',
            'click .cancel-share': 'unshare'
        },
        
        initialize: function() {
            console.log('init GroupRepoView');
            Backbone.View.prototype.initialize.apply(this, arguments);

            this.listenTo(this.model, 'destroy', this.remove);
        },

        render: function() {
            this.$el.html(this.template(this.model.toJSON()));
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
                    .replace(/\{placeholder\}/g, '<span class="op-target">' + this.model.get('name') + '</span>'),
                yesCallback
            );
        },

    });

    return GroupRepoView;
});
