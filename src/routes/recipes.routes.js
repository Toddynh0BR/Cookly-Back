const { Router } = require("express");
const  upload  = require("../configs/upload");

const RecipesController = require("../controllers/RecipesController");
const recipesController = new RecipesController();

const recipesRoutes = Router();

recipesRoutes.post("/create", upload.single("image"), recipesController.create);
recipesRoutes.put("/", upload.single("image"), recipesController.update);
recipesRoutes.post("/index", recipesController.index);
recipesRoutes.get("/:id", recipesController.show);
recipesRoutes.delete("/", recipesController.delete);

module.exports = recipesRoutes;

