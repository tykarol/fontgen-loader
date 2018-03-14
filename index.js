let loaderUtils = require('loader-utils');
let webFontsGenerator = require('webfonts-generator');
let path = require('path');
let glob = require('glob');
let isUrl = require('is-url');
let url = require('url');

let mimeTypes = {
    'eot': 'application/vnd.ms-fontobject',
    'svg': 'image/svg+xml',
    'ttf': 'application/x-font-ttf',
    'woff': 'application/font-woff',
    'woff2': 'font/woff2'
};

function getFilesAndDeps (patterns, context) {
    let files = [];
    let filesDeps = [];
    let directoryDeps = [];

    function addFile (file) {
        filesDeps.push(file);
        files.push(path.resolve(context, file));
    }

    function addByGlob (globExp) {
        let globOptions = {cwd: context};

        let foundFiles = glob.sync(globExp, globOptions);
        files = files.concat(foundFiles.map(file => {
            return path.resolve(context, file);
        }));

        let globDirs = glob.sync(path.dirname(globExp) + '/', globOptions);
        directoryDeps = directoryDeps.concat(globDirs.map(file => {
            return path.resolve(context, file);
        }));
    }

    // Re-work the files array.
    patterns.forEach(function (pattern) {
        if (glob.hasMagic(pattern)) {
            addByGlob(pattern);
        } else {
            addFile(pattern);
        }
    });

    return {
        files: files,
        dependencies: {
            directories: directoryDeps,
            files: filesDeps
        }
    };
}

// Futureproof webpack option parsing
function wpGetOptions (context) {
    if (typeof context.query === 'string') return loaderUtils.getOptions(context);
    return context.query;
}

function isFunction(functionToCheck) {
    const getType = {};
    return functionToCheck && getType.toString.call(functionToCheck) === '[object Function]';
}

module.exports = function (content) {
    this.cacheable();
    let params = loaderUtils.getOptions(this) || {};
    let config;
    try {
        config = JSON.parse(content);
    } catch (ex) {
        config = this.exec(content, this.resourcePath);
        if (isFunction(config)) {
            config = config(params);
        }
    }

    let filesAndDeps = getFilesAndDeps(config.files, this.context);
    filesAndDeps.dependencies.files.forEach(this.addDependency.bind(this));
    filesAndDeps.dependencies.directories.forEach(this.addContextDependency.bind(this));
    config.files = filesAndDeps.files;

    // With everything set up, let's make an ACTUAL config.
    let formats = config.types || ['eot', 'woff', 'woff2', 'ttf', 'svg'];
    if (formats.constructor !== Array) {
        formats = [formats];
    }

    let generatorConfiguration = {
        files: config.files,
        fontName: config.fontName,
        types: formats,
        order: formats,
        fontHeight: config.fontHeight || 1000, // Fixes conversion issues with small svgs,
        codepoints: config.codepoints || {},
        templateOptions: {
            baseSelector: config.baseSelector || '.icon',
            classPrefix: 'classPrefix' in config ? config.classPrefix : 'icon-'
        },
        dest: '',
        writeFiles: false,
        formatOptions: config.formatOptions || {}
    };

    // Try to get additional options from webpack query string or font config file
    Object.assign(generatorConfiguration, wpGetOptions(this));
    Object.assign(generatorConfiguration, config);

    // This originally was in the object notation itself.
    // Unfortunately that actually broke my editor's syntax-highlighting...
    // ... what a shame.
    if (typeof config.rename === 'function') {
        generatorConfiguration.rename = config.rename;
    } else {
        generatorConfiguration.rename = function (f) {
            return path.basename(f, '.svg');
        };
    }

    if (config.cssTemplate) {
        generatorConfiguration.cssTemplate = path.resolve(this.context, config.cssTemplate);
    }

    if (config.cssFontsPath) {
        generatorConfiguration.cssFontsPath = path.resolve(this.context, config.cssFontsPath);
    }

    for (let option in config.templateOptions) {
        if (config.templateOptions.hasOwnProperty(option)) {
            generatorConfiguration.templateOptions[option] = config.templateOptions[option];
        }
    }

    // svgicons2svgfont stuff
    let keys = [
        'fixedWidth',
        'centerHorizontally',
        'normalize',
        'fontHeight',
        'round',
        'descent'
    ];
    for (let x in keys) {
        if (typeof config[keys[x]] !== 'undefined') {
            generatorConfiguration[keys[x]] = config[keys[x]];
        }
    }

    let cb = this.async();

    // Generate destination path for font files, dest option from options takes precedence
    let opts = this.options || {};

    let pub = (
        generatorConfiguration.dest || (opts.output && opts.output.publicPath) || '/'
    );
    let embed = !!params.embed;

    if (generatorConfiguration.cssTemplate) {
        this.addDependency(generatorConfiguration.cssTemplate);
    }

    if (generatorConfiguration.cssFontsPath) {
        this.addDependency(generatorConfiguration.cssFontsPath);
    }

    webFontsGenerator(generatorConfiguration, (err, res) => {
        if (err) {
            return cb(err);
        }
        let urls = {};
        for (let i in formats) {
            let format = formats[i];
            if (!embed) {
                let filename = config.fileName || params.fileName || '[hash]-[fontname].[ext]';
                filename = filename
                    .replace('[fontname]', generatorConfiguration.fontName)
                    .replace('[ext]', format);
                let formatUrl = loaderUtils.interpolateName(this,
                    filename,
                    {
                        context: this.rootContext || this.context,
                        content: res[format]
                    }
                );

                if (isUrl(pub)) {
                    urls[format] = url.resolve(pub, formatUrl);
                } else {
                    urls[format] = path.join(pub, formatUrl);
                }

                urls[format] = urls[format].replace(/\\/g, '/');

                if (generatorConfiguration.dest) {
                    this.emitFile(urls[format], res[format]);
                } else {
                    this.emitFile(formatUrl, res[format]);
                }
            } else {
                urls[format] = 'data:' +
                    mimeTypes[format] +
                    ';charset=utf-8;base64,' +
                    (Buffer.from(res[format]).toString('base64'));
            }
        }
        cb(null, res.generateCss(urls));
    });
};
