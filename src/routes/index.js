const { Router } = require("express");

const iaRoutes = require('./ia.routes');
const usersRoutes = require('./users.routes');
const othersRoutes = require('./others.routes');
const recipesRoutes = require('./recipes.routes');

const routes = Router();

routes.use('/IA', iaRoutes)
routes.use('/user', usersRoutes);
routes.use('/other', othersRoutes);
routes.use('/recipe', recipesRoutes);

module.exports = routes

