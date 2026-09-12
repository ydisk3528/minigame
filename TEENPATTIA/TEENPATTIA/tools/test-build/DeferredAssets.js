"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeferredAssets = void 0;
const cc_1 = require("cc");
const { ccclass, property } = cc_1._decorator;
let DeferredAssets = class DeferredAssets extends cc_1.Component {
    constructor() {
        super(...arguments);
        this.faces = [];
        this.portraits = [];
        this.sounds = [];
        this.soundNames = [];
    }
};
exports.DeferredAssets = DeferredAssets;
__decorate([
    property([cc_1.SpriteFrame])
], DeferredAssets.prototype, "faces", void 0);
__decorate([
    property([cc_1.SpriteFrame])
], DeferredAssets.prototype, "portraits", void 0);
__decorate([
    property([cc_1.AudioClip])
], DeferredAssets.prototype, "sounds", void 0);
__decorate([
    property([cc_1.CCString])
], DeferredAssets.prototype, "soundNames", void 0);
exports.DeferredAssets = DeferredAssets = __decorate([
    ccclass('DeferredAssets')
], DeferredAssets);
