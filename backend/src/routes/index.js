const express = require('express');
const { asyncHandler } = require('../utils/errors');
const { optionalAuth, requireAuth } = require('../middleware/auth');
const { upload, validateImageContent } = require('../middleware/upload');
const controller = require('../controllers/market.controller');

const router = express.Router();
const route = (handler) => asyncHandler(handler);

router.post('/auth/login', route(controller.login));
router.post('/auth/register', route(controller.register));
router.get('/auth/me', requireAuth, route(controller.me));
router.post('/auth/change-password', requireAuth, route(controller.changePassword));

router.get('/ads', route(controller.listAds));
router.get('/ads/:id', optionalAuth, route(controller.getAd));
router.post('/ads/:id/views', route(controller.incrementViews));
router.get('/account/ads', requireAuth, route(controller.myAds));
router.post('/ads', requireAuth, route(controller.createAd));
router.patch('/ads/:id', requireAuth, route(controller.updateAd));
router.delete('/ads/:id', requireAuth, route(controller.deleteAd));
router.post('/ads/:id/renew', requireAuth, route(controller.renewAd));
router.post('/uploads', requireAuth, upload.array('images', 5), validateImageContent, route(controller.upload));

router.get('/account/favorites', requireAuth, route(controller.favorites));
router.post('/account/favorites/:id', requireAuth, route(controller.saveFavorite));
router.delete('/account/favorites/:id', requireAuth, route(controller.removeFavorite));
router.patch('/account/profile', requireAuth, route(controller.updateProfile));
router.post('/reports', optionalAuth, route(controller.report));
router.post('/feedback', optionalAuth, route(controller.feedback));

router.get('/admin/stats', requireAuth, route(controller.adminStats));
router.get('/admin/listings', requireAuth, route(controller.adminListings));
router.delete('/admin/listings/:id', requireAuth, route(controller.adminDeleteAd));
router.get('/admin/reports', requireAuth, route(controller.adminReports));
router.patch('/admin/reports/:id', requireAuth, route(controller.adminUpdateReport));

module.exports = router;
