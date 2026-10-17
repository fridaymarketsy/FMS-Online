const market = require('../services/market.service');
const { uploadImages, deleteImages } = require('../services/upload.service');
const { toMarketUser } = require('../models/profile.model');
const { httpError } = require('../utils/errors');
const { requireFields, validateAd, validateRegistration } = require('../validators/market.validators');

const controllers = {
  login: async (req, res) => res.json(await market.login(req.body)),
  register: async (req, res) => {
    validateRegistration(req.body);
    res.status(201).json(await market.register(req.body));
  },
  me: async (req, res) => {
    const profile = await market.getProfile(req.user.id);
    res.json({ user: profile ? toMarketUser(profile) : null });
  },
  changePassword: async (req, res) => res.json(await market.changePassword(req.user.id, req.body)),
  listAds: async (req, res) => res.json(await market.listAds(req.query)),
  getAd: async (req, res) => res.json(await market.getAd(req.params.id, req.user)),
  incrementViews: async (req, res) => {
    await market.incrementViews(req.params.id);
    res.json({ ok: true });
  },
  myAds: async (req, res) => res.json(await market.myAds(req.user.id)),
  createAd: async (req, res) => {
    validateAd(req.body);
    try {
      res.status(201).json(await market.createAd(req.user.id, req.body));
    } catch (error) {
      await deleteImages(req.body.images, req.user.id);
      throw error;
    }
  },
  deleteAd: async (req, res) => res.json(await market.deleteAd(req.params.id, req.user.id)),
  renewAd: async (req, res) => res.json(await market.renewAd(req.params.id, req.user.id)),
  updateAd: async (req, res) => res.json(await market.updateAd(req.params.id, req.user.id, req.body)),
  favorites: async (req, res) => res.json(await market.favorites(req.user.id)),
  saveFavorite: async (req, res) => res.json(await market.saveFavorite(req.user.id, req.params.id)),
  removeFavorite: async (req, res) => res.json(await market.removeFavorite(req.user.id, req.params.id)),
  report: async (req, res) => {
    requireFields(req.body, ['adId', 'reason']);
    await market.report(req.user?.id, req.body);
    res.status(201).json({ ok: true });
  },
  feedback: async (req, res) => {
    requireFields(req.body, ['type', 'description']);
    await market.feedback(req.user?.id, req.body);
    res.status(201).json({ ok: true });
  },
  updateProfile: async (req, res) => res.json(await market.updateProfile(req.user.id, req.body)),
  adminStats: async (req, res) => res.json(await market.adminStats(req.user.id)),
  adminListings: async (req, res) => res.json(await market.adminListings(req.user.id)),
  adminReports: async (req, res) => res.json(await market.adminReports(req.user.id)),
  adminDeleteAd: async (req, res) => res.json(await market.adminDeleteAd(req.user.id, req.params.id)),
  adminUpdateReport: async (req, res) => res.json(await market.adminUpdateReport(req.user.id, req.params.id, req.body.status)),
  upload: async (req, res) => {
    if (!req.files?.length) throw httpError(400, 'أضف صورة واحدة على الأقل');
    res.status(201).json({ urls: await uploadImages(req.files, req.user.id) });
  },
};

module.exports = controllers;
