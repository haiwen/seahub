define([
    'jquery',
    'simplemodal',
    'underscore',
    'backbone',
    'common',
    'app/views/add-repo'
], function($, simplemodal, _, Backbone, Common, AddRepoView) {
    'use strict';

    var View = AddRepoView.extend({

        template: _.template($('#create-department-repo-tmpl').html()),

        templateData: function() {
            return {
            };
        },

        newAttributes: function() {
            return {
                'name': $.trim($('input[name=repo_name]', this.$el).val()),
                'permission': $('select[name=permission]', this.$el).val()
            };
        }

    });

    return View;
});
