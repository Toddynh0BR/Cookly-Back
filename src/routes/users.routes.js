const { Router } = require("express");

const UsersController = require("../controllers/UsersController");
const usersController = new UsersController();

const usersRoutes = Router();

usersRoutes.post("/local-signin", usersController.localLogin);
usersRoutes.post("/local-signup", usersController.localCreate);
usersRoutes.post("/signin", usersController.login);
usersRoutes.post("/signup", usersController.create);
usersRoutes.put("/update", usersController.update);
usersRoutes.post("/forgot", usersController.forgotPassword);
usersRoutes.post("/reset", usersController.resetPassword);
usersRoutes.delete('/delete', usersController.deleteUser);

module.exports = usersRoutes;

