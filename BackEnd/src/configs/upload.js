const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: path.resolve(__dirname, "..", "uploads"),
  filename: (req, file, cb) => {
    const fileName = `${Date.now()}-${file.originalname}`;
    cb(null, fileName);
  }
});

const upload = multer({ storage });

module.exports = upload;
