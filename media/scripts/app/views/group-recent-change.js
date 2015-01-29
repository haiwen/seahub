define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'app/collections/group-changes',
    'app/views/group-change-items'
], function($, _, Backbone, Common, RecentChanges, GroupChangeItemView) {
    'use strict';

    var GroupRecentChangeView = Backbone.View.extend({
        el: '#grp-repos-commits',

        initialize: function() {
            this.$cont = this.$el;
            this.$table = $('table', this.$el);
            this.$tableHead = $('thead', this.$table);
            this.$tableBody = $('tbody', this.$table);

            this.listenTo(RecentChanges, 'add', this.addOne);
            this.listenTo(RecentChanges, 'reset', this.addAll);
            this.listenTo(RecentChanges, 'error', this.error);
            this.listenTo(RecentChanges, 'all', this.render); // XXX: really render table when recieve any event ?

        },

        error: function(model_or_collection, resp, options) {
            Common.feedback(resp.statusText, "error", Common.ERROR_TIMEOUT);
        },

        all: function(event) {
            console.log('event: ' + event);
        },

        addOne: function(change, collection, options) {
            console.log('add one change');
            var view = new GroupChangeItemView({model: change});
            if (options.prepend) {
                this.$tableBody.before(view.render().el);
            } else {
                this.$tableBody.append(view.render().el);
            }
        },

        addAll: function() {
            console.log('add all');
            this.resetTable();
            RecentChanges.each(this.addOne, this);
        },

        // Reset table by empty table body.
        resetTable: function() {
            console.log('reset table');
            this.$tableBody.empty();
        },

        show: function() {
            RecentChanges.fetch({reset: true});
        },

        render: function(event) {
            console.log('got event: ' + event + ', render change list...' );

            this.$table.parent().show();
            this.hideLoading();

            if (RecentChanges.length) {
                this.showTable();
            } else {
                this.hideTable();
            }
            
        },

        hideTable: function() {
            this.$table.hide();
        },

        showTable: function() {
            this.$table.show();
        },

        hideLoading: function() {
            this.$cont.find('.loading').hide();
        },

        showLoading: function() {
            this.$cont.find('.loading').show();
        },

    });

    return GroupRecentChangeView;
});
