var glob = require("glob").sync;

module.exports = (envOptions) => {
    envOptions = envOptions || {};
    const isProd = envOptions.ENV === 'Prod';
    const config = {
        fontName: "Octicons",
        files: glob("./octicons/svg/*.svg"),
        baseClass: "octicon",
        classPrefix: "octicon-"
    };
    return config;
};