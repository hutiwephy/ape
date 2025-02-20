const CryptoJS = require("crypto-js");
const Session = require("./lib/session.js");
const {hash, WordArray2ArrayBuffer} = require("./lib/extensions.js");

window.hash = hash;
window.WordArray2ArrayBuffer = WordArray2ArrayBuffer;
window.CryptoJS = CryptoJS;
window.request = require("./lib/request/browser.js");
window.ape.Session = Session;
window.ape.request = require("./lib/request.js")(window.request);
