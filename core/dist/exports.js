"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Version = void 0;
const fs_1 = require("fs");
exports.Version = JSON.parse(fs_1.readFileSync(`${__dirname}/../package.json`, { encoding: 'utf8' })).version;
//# sourceMappingURL=exports.js.map