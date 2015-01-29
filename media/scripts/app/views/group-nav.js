define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'app/collections/groups',
    'text!' + app.config._tmplRoot + 'group-nav.html',
], function($, _, Backbone, Common, GroupCollection, GroupNavTemplate) {
    'use strict';

    var GroupNavView = Backbone.View.extend({

        template: _.template(GroupNavTemplate),

        initialize: function(options) {
            this.groups = new GroupCollection();
            this.listenTo(this.groups, 'reset', this.reset);
        },

        reset: function() {
            //console.log(this.template({groups: this.groups.models}));
        },

        fetch: function() {
            this.groups.fetch({reset: true});
        },

    });

    return GroupNavView;
});
