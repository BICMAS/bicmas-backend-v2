"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _express = require("express");
var _authMiddleware = require("../middleware/authMiddleware.js");
var _PushController = require("../controllers/PushController.js");
const pushRouter = (0, _express.Router)();
pushRouter.get('/vapid-public-key', _PushController.getVapidPublicKey);
pushRouter.post('/subscribe', _authMiddleware.authenticateToken, _PushController.subscribePush);
pushRouter.delete('/subscribe', _authMiddleware.authenticateToken, _PushController.unsubscribePush);
var _default = exports.default = pushRouter;