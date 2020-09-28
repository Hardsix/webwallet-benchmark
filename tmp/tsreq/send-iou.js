var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var sdk = require('@webwallet/sdk');
var bs58check = require('bs58check');
var request = require('request-promise');
var _ = require('lodash');
var bluebird = require('bluebird');
var defaultDate = (new Date(2023)).toISOString();
var issuer = {
    scheme: "ecdsa-ed25519",
    public: "0423f8b192884eb5d71802fb50f21068fa43c9733893a6d4bb420e2827647cb728178dfe197957c127ee6851250611d9205ed9a5435034f0169580e899e7b32282",
    secret: "03ead306f42e95861bed33effe37f2bc2720d5f8da3ba286b358d78cfff245af",
    signer: "wdEHHkz5FLAvb2UfmCSrw1w9Dn87reYuSP"
};
var SYMBOL = issuer.signer;
var rojo = {
    scheme: "ecdsa-ed25519",
    public: "040847a066ec3d86b2766a2fad0331e64c34ce45d1e457c45b6eb5d171bd5143ce6b6873efd10ce0dba3001bea8d85fe2ab02c80dca3b00083b78f503dd0ce0275",
    secret: "043cae98277b4cb909d2b81559ab907e9ae5321e790678494634bfcdea2b722d",
    signer: "wbmMFVkmphCeb5QEXdTqfXp52EatuE1Quu"
};
var amarillo = {
    scheme: "ecdsa-ed25519",
    public: "04147f1c7d498559279b322ff5023b206fb7c138208f8b957810740124fdf4cadd5ae9f8fa1729f286c8922ba096e987e52c72ebfdf4382b3101e133225f3afa54",
    secret: "9a4811f1b5af9a810d2a89e172c24ff8a4bbb130d841d565c727d725f6d3a7",
    signer: "wc3Kgynkv96bK6Ukef3TrhP4CvZPkxQ1un"
};
function send(sourceAddress, sourceKeys, targetAddress, amount, symbol, expiry, logging) {
    if (expiry === void 0) { expiry = defaultDate; }
    if (logging === void 0) { logging = false; }
    return __awaiter(this, void 0, void 0, function () {
        var claims, signers, iou, body, res, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    claims = {
                        domain: 'localhost',
                        source: sourceAddress,
                        target: targetAddress,
                        amount: amount,
                        symbol: symbol,
                        expiry: (new Date(2023)).toISOString()
                    };
                    signers = [sourceKeys];
                    iou = sdk.iou.write(claims).sign(signers);
                    body = {
                        data: {
                            inputs: [iou]
                        }
                    };
                    /* Send transaction request */
                    // console.log(`${JSON.stringify(iou, null, 2)}`)
                    if (logging) {
                        console.log("Sending " + amount + " " + symbol + " from " + sourceAddress + " to " + targetAddress);
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, request({
                            method: 'POST',
                            uri: 'http://localhost:8082/transaction',
                            body: body,
                            headers: {
                                'content-type': 'application/json',
                            },
                            json: true,
                        })];
                case 2:
                    res = _a.sent();
                    console.log('IOU dispatched!');
                    return [3 /*break*/, 4];
                case 3:
                    err_1 = _a.sent();
                    console.log('ERROR OCCURRED');
                    // console.log(`Error occurred: ${JSON.stringify(err, null, 2)}`)
                    return [2 /*return*/];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function issue(amount, targetAddress) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, send(issuer.signer, issuer, targetAddress, amount, SYMBOL)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var responses;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    issue('1000000', rojo.signer);
                    return [4 /*yield*/, bluebird.map(_.range(100), function (r) { return __awaiter(_this, void 0, void 0, function () {
                            var res;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, send(rojo.signer, rojo, amarillo.signer, '10', SYMBOL)];
                                    case 1:
                                        res = _a.sent();
                                        console.log('ANOTHER ONE!');
                                        return [2 /*return*/];
                                }
                            });
                        }); }, { concurrency: 5 })];
                case 1:
                    responses = _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
main()
    .then(function () { return console.log('DONE'); });
