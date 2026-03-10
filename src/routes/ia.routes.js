const { Router } = require("express");

const IAController = require("../controllers/IAController");
const iaController = new IAController();

const iaRoutes = Router();

iaRoutes.get("/", iaController.CreateNewRecipe);
iaRoutes.post("/", iaController.UserCreateIa);

module.exports = iaRoutes;

