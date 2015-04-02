define([
    'jquery',
    'simplemodal',
    'underscore',
    'backbone',
    'common',
    'app/views/add-repo',
    'text!' + app.config._tmplRoot + 'create-repo.html'
], function($, simplemodal, _, Backbone, Common, AddRepoView, CreateRepoTemplate) {
    'use strict';

    var AddGroupRepoView = AddRepoView.extend({
        templateData: function() {
            return {
                showSharePerm: true
            };
        },

        newAttributes: function() {
            var baseAttrs = AddRepoView.prototype.newAttributes.apply(this);

            return _.extend(baseAttrs, {'permission': $('select[name=permission]', this.$el).val()});
        },

    });

    return AddGroupRepoView;
});
