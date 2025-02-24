const CryptoJS = require("crypto-js");
const Session = require("./lib/session.js");
const {hash, WordArray2ArrayBuffer} = require("./lib/extensions.js");
const jwt = require("./lib/jwt.js");

module.exports = {
    jwt: {
        RegisteredClaims: jwt.RegisteredClaims,
    },
    hash,
    WordArray2ArrayBuffer,
    CryptoJS,
    request: require("./lib/request/browser.js"),
    ape: {
        Session,
        request: require("./lib/request.js")(require("./lib/request/browser.js")),
    },
};
