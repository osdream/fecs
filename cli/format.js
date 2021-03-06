/**
 * @file 代码格式化入口
 * @author chris<wfsr@foxmail.com>
 */

var fs            = require('vinyl-fs');

var util          = require('../lib/util');
var ignored       = require('../lib/ignored');
var jsformatter   = require('../lib/js/formatter');
var cssformatter  = require('../lib/css/formatter');
var htmlformatter = require('../lib/html/formatter');

/**
 * 不同的输入流处理
 *
 * @namespace
 */
var streams = {

    /**
     * 处理文件系统中的代码
     *
     * @param {Object} options minimist 处理后的 cli 参数
     * @return {Transform} 转换流
     */
    files: function (options) {
        var patterns = util.buildPattern(options._, options.types);
        var specials = patterns.specials;
        delete patterns.specials;

        return fs.src(patterns, {cwdbase: true})
            .pipe(ignored(options, specials))
            .pipe(jsformatter(options))
            .pipe(cssformatter(options))
            .pipe(htmlformatter(options))
            .pipe(fs.dest(options.output));
    },

    /**
     * 处理从 stdin 输入的代码
     *
     * @param {Object} options minimist 处理后的 cli 参数
     * @return {Transform} 转换流
     */
    stdin: function (options) {
        var through = require('through2');
        var File = require('vinyl');

        var type = (options.type || 'js').split(',')[0];
        var handler = type === 'js' ? jsformatter(options) : (type === 'css' ? cssformatter(options) : through());

        return process.stdin
            .pipe(
                through.obj(function (chunk, enc, cb) {
                    cb(null, new File({contents: chunk, path: 'current-file.' + type}));
                }
            ))
            .pipe(handler)
            .pipe(
                through.obj(function (file, enc, cb) {
                    process.stdout.write(file.contents.toString() + '\n');
                    cb(null, file);
                }
            ));
    }
};

/**
 * format 处理入口
 *
 * @param {Object} options minimist 处理后的 cli 参数
 */
exports.run = function (options) {
    console.time('fecs');

    streams[options.stream ? 'stdin' : 'files'](options)
        .once('end', function () {
            console.timeEnd('fecs');
        });
};
