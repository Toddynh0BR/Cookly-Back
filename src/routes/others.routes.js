const { Router } = require("express");

const OthersController = require("../controllers/OthersController");
const othersController = new OthersController();

const othersRoutes = Router();

othersRoutes.post("/favorite", othersController.toggleFavorite);
othersRoutes.post("/notification", othersController.toggleNotification);
othersRoutes.post("/notification_add", othersController.addNotification);

module.exports = othersRoutes;

