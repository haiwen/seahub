define([
    'jquery',
    'underscore',
    'backbone',
    'common'
], function($, _, Backbone, Common) {
    'use strict';

    var AddPubrepoItem = Backbone.View.extend({
        tagName: 'tr',

        template: _.template($('#add-pubrepo-item-tmpl').html()),

        events: {
            'click .select': 'select',
            'change .share-permission-select': 'selectPerm'
        },

        initialize: function () {
        },

        selectPerm: function (e) {
            var perm = $(e.currentTarget).val();
            this.model.set({'pub_perm': perm}, {silent:true});
        },

        select: function () {
            var $checkbox = this.$('[type=checkbox]');
            if ($checkbox.prop('checked')) {
                this.model.set({'selected':true}, {silent:true});
            } else {
                this.model.set({'selected':false}, {silent:true});
            }
        },

        render: function () {
            this.$el.html(this.template(this.model.toJSON()));
            return this;
        }

    });

    return AddPubrepoItem;
});
