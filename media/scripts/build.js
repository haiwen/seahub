({
    mainConfigFile: "common.js",

    baseUrl : ".",
    findNestedDependencies: true, // find runtime dependencies
    removeCombined: true,
    // fileExclusionRegExp: /^dist$/,
    dir: "dist",

    modules: [
        {
            name: "myhome"
        },

        {
            name: "group"
        }
    ]
})
