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
        el: '#header-inner',

        template: _.template(GroupNavTemplate),

        initialize: function(options) {
            this.$topNavGrp = this.$('#top-nav-grp');
            this.groups = new GroupCollection();
            this.listenTo(this.groups, 'reset', this.render);
            this.groups.fetch({reset: true});
        },

        initializeGroups: function() {
            this.$groupInfo= this.$('#top-nav-grp-info');
        },

        events: {
            'mouseenter .nav-item-group': 'showGroupInfo',
            'mouseleave .nav-item-group': 'hideGroupInfo',
            'mouseenter #top-nav-grp-list .item': 'highLightItem',
            'mouseleave #top-nav-grp-list .item': 'notHighLightItem',
            'click #top-nav-grp-list .item': 'enterGroup'
        },

        showGroupInfo: function() {
            this.$groupInfo.removeClass('hide');
        },

        hideGroupInfo: function(e) {
            this.$groupInfo.addClass('hide');
        },

        highLightItem: function(e) {
            $(e.currentTarget).addClass('hl').children('.a').removeClass('vh');
        },

        notHighLightItem: function(e) {
            $(e.currentTarget).removeClass('hl').children('.a').addClass('vh');
        },

        render: function() {
            this.$topNavGrp.after(this.template({groups: this.groups.toJSON()}));
            this.initializeGroups();
            this.$groupInfo.css({'right': (this.$topNavGrp.outerWidth() - this.$groupInfo.outerWidth())/6 * 5});
        },

        enterGroup: function(e) {
            location.href = $(e.currentTarget).attr('data-url');
        },
    });

    return GroupNavView;
});
