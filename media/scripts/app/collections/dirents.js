define([
    'underscore',
    'backbone',
    'app/models/dirent'
], function(_, Backbone, Dirent) {
    'use strict';

    var DirentCollection = Backbone.Collection.extend({
        model: Dirent,

        initialize: function(id, path) {
            console.log('init DirentCollection: ' + id + ' ' + path);
            this.url = '/api2/repos/' + id + '/dir/?p=' + path;
        }

    });

    return DirentCollection;

});
