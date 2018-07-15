// Sense Hat Module
var sense = require("sense-hat-led");
var senseJoystick = require('sense-joystick');
var config = require('config');

// Log Module
var winston = require('winston');

// Web Module
var helmet = require('helmet');
var express = require('express');
var app = express();
var server = require('http').createServer(app);

// Utility Module
var moment = require("moment");
var request = require('request');
var async = require("async");

var APP_NAME = "Notifier";
var LOG_LABEL = "notifier";
var LOG_FILE = 'logs/notifier-%DATE%.log';
var HTTP_PORT = 8888;
var CHECK_URL = config.get('CheckSite.URL');

var options = {
    url: CHECK_URL,
    headers: {
        'User-Agent': 'request'
    }
};

var MAX_COUNT = 60;
var RESTART_INTERVAL = 60;
var ALERT_INTERVAL = 120000000;
let t1 = 0.1;
let t2 = 0.1;
let timeout1 = (callback) => setTimeout(callback, t1 * 1000);
let timeout2 = (callback) => setTimeout(callback, t2 * 1000);
var image = null;
var interval = null;
var count = 0;

function checkURL(callback) {
    request(options, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            info = JSON.parse(body);
            info.localTime = moment();
            logger.info("Code : " + info.code);
            logger.info("Time : " + info.time);

            var serverTime = moment(info.time);
            var currentTime = moment();

            var diff = moment.duration(currentTime.diff(serverTime)).as("seconds");

            logger.info("Diff : " + diff + "s" + " : " + ALERT_INTERVAL);

            if (diff <= ALERT_INTERVAL) {
                if (info.code == "999") {
                    showSuccess();
                } else {
                    showFailure();
                }
            } else {
                logger.info("Old news is so interesting");
            }
            // Callback
            if (callback) callback();
        }
    });
}

function main() {

    logger = initializeLogger(LOG_LABEL, LOG_FILE);

    /**
     * Notify by Button
     */
    senseJoystick.getJoystick().then((joystick) => {
        joystick.on('press', (direction) => {
            logger.info('Got button press in the direction: ', direction);
            triggerRefresh();
        })
    });

    /**
     *  Notify by Web
     */
    app.get('/notify', function (req, res) {
        logger.info("Incoming web notifier");
        triggerRefresh(function () {
            res.end(JSON.stringify(info));
        });
    });

    // Set Express Property
    app.set('port', HTTP_PORT);
    app.use('/', express.static('web'));
    app.use(helmet());

    // Initialize and make sure Port is reachable
    server.listen(app.get('port'), function () {
        logger.info("==========================================================")
        logger.info("[" + APP_NAME + "] Web server is listening on port " + app.get('port'));
        logger.info("Log Location   : " + LOG_FILE);
        logger.info("==========================================================")
    });


    checkURL();
}

function showSuccess() {
    isSuccess = true;
    showStatus();
}

function showFailure() {
    isSuccess = false;
    showStatus();
}

function showStatus() {
    if (count++ == MAX_COUNT) {
        logger.info("Finish whole interation " + (count - 1));
        count = 0;
        setTimeout(sense.clear, 100);
        // Set it auto restart 
        if (interval == null) {
            interval = setInterval(checkURL, RESTART_INTERVAL * 1000);
            logger.info("Set it auto restart");
        }

        return;
    }

    async.series(
        [
            (callback) => {
                showPixel(callback);
            },
            timeout1,
            // Loop again
            showStatus

            // (callback) => {
            //     logger.info('Interation : ' + count);
            //     callback()
            // },
        ]
    );
}

/**
 * Graphic Setting
 */
var BLACK = [0, 0, 0];
var WHITE = [255, 255, 255];
var RED = [255, 0, 0];
var ORANGE = [255, 127, 0];
var YELLOW = [255, 255, 0];
var GREEN = [0, 255, 0];
var CYAN = [0, 0, 255];
var BLUE = [75, 0, 130];
var PURPLE = [148, 0, 211];
var O = WHITE;
var R = RED;
var X = BLACK;

var A = RED;
var B = ORANGE;
var C = YELLOW;
var D = GREEN;
var E = CYAN;
var F = BLUE;
var G = PURPLE;
var H = WHITE;



function showPixel(callback) {

    if (isSuccess) {
        symbol = getIcon("ok");
    } else {
        symbol = getIcon("rainbow");
    }

    sense.setPixels(symbol.pixel);
    shiftColor();
    callback();
}

function shiftColor() {
    switch (symbol.name) {
        case "cross":
            X = (count % 2 == 0) ? BLACK : WHITE;
            break;
        case "hsbc":
            O = (count % 2 == 0) ? BLACK : WHITE;
            R = (count % 2 == 0) ? BLACK : RED;
            break;
        case "ok":
            R = (count % 2 == 0) ? BLACK : RED;
            B = (count % 2 == 0) ? BLACK : GREEN;
            break;
        case "rainbow":
            var temp = A;
            A = B;
            B = C;
            C = D;
            D = E;
            E = F;
            F = G;
            G = H;
            H = temp;
            break;
        default:
            break;
    }


}

function getIcon(name) {
    var map = [];

    addIcon(map, {
        name: "rainbow",
        pixel: [
            A, B, C, D, E, F, G, H,
            A, B, C, D, E, F, G, H,
            A, B, C, D, E, F, G, H,
            A, B, C, D, E, F, G, H,
            A, B, C, D, E, F, G, H,
            A, B, C, D, E, F, G, H,
            A, B, C, D, E, F, G, H,
            A, B, C, D, E, F, G, H,
        ]
    });

    addIcon(map, {
        name: "cross",
        pixel: [
            A, B, C, X, X, F, G, H,
            A, B, C, X, X, F, G, H,
            A, B, C, X, X, F, G, H,
            X, X, X, C, C, X, X, X,
            X, X, X, C, C, X, X, X,
            A, B, C, X, X, F, G, H,
            A, B, C, X, X, F, G, H,
            A, B, C, X, X, F, G, H,
        ]
    });

    addIcon(map, {
        name: "hsbc",
        pixel: [
            X, X, X, X, X, X, X, X,
            X, X, R, R, R, R, X, X,
            X, R, O, R, R, O, R, X,
            R, R, O, O, O, O, R, R,
            X, R, O, R, R, O, R, X,
            X, X, R, R, R, R, X, X,
            X, X, X, X, X, X, X, X,
            X, X, X, X, X, X, X, X,
        ]
    });

    addIcon(map, {
        name: "ok",
        pixel: [
            X, R, R, X, B, X, X, B,
            R, X, X, R, B, X, B, X,
            R, X, X, R, B, B, B, X,
            R, X, X, R, B, B, X, X,
            R, X, X, R, B, B, X, X,
            R, X, X, R, B, B, B, X,
            R, X, X, R, B, X, B, X,
            X, R, R, X, B, X, X, B,
        ]
    });

    return map[name];
}

function addIcon(map, symbol) {
    map[symbol.name] = symbol;
}

function triggerRefresh(callback) {
    if (count == 0) // Not running
    {
        logger.info("Trigger checking by manual");
        clearInterval(interval);
        checkURL(callback);
    } else {
        logger.info("Notifier is running");
        if (callback) callback();
    }
}


/**
 * Initialize Logger
 */
function initializeLogger(labelName, logFile) {
    const {
        createLogger,
        format,
        transports
    } = require('winston');
    const {
        combine,
        timestamp,
        label,
        printf
    } = format;

    const myFormat = printf(info => {
        return `${info.timestamp} [${info.label}] ${info.level}: ${info.message}`;
    });

    require('winston-daily-rotate-file');
    var transport = new(winston.transports.DailyRotateFile)({
        filename: logFile,
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '14d'
    });

    const logger = createLogger({
        level: 'info',
        format: combine(
            label({
                label: labelName
            }),
            timestamp(),
            myFormat
        ),
        transports: [
            new transports.Console(),
            transport
        ]
    });
    return logger;
}

// Main Iteration
main();