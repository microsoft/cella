"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const twisp_core_1 = require("@microsoft/twisp.core");
const mocha_1 = require("@testdeck/mocha");
const assert_1 = require("assert");
const exports_1 = require("../exports");
// eslint-disable-next-line @typescript-eslint/no-var-requires
require('source-map-support').install();
let BasicTests = class BasicTests {
    'Ensure that the core version is greaterthan or equal to the cli version'() {
        assert_1.strictEqual(exports_1.Version <= twisp_core_1.Version, true, `Core version (${twisp_core_1.Version}) should be greater than or equal to version (${exports_1.Version})`);
    }
};
__decorate([
    mocha_1.test
], BasicTests.prototype, "Ensure that the core version is greaterthan or equal to the cli version", null);
BasicTests = __decorate([
    mocha_1.suite
], BasicTests);
//# sourceMappingURL=sample-test.js.map