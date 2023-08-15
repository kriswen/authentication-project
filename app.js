//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const port = 3000;
const bcrypt = require("bcrypt");
const saltRounds = 10;
const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));

mongoose.connect("mongodb://localhost:27017/userDB", { useNewUrlParser: true });

// const userSchema = { //simple javascript object
//   email: String,
//   password: String,
// };

const userSchema = new mongoose.Schema({
  //this need to be proper moogonse schema
  email: String,
  password: String,
});

const User = new mongoose.model("User", userSchema);

app.get("/", (req, res) => {
  res.render("home");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.post("/register", (req, res) => {
  // Store hash in your password DB.
  bcrypt
    .hash(req.body.password, saltRounds) //hashsync is synchronous function, hash is async function
    .then(function (hash) {
      const newUser = new User({
        email: req.body.username,
        password: hash,
      });

      newUser
        .save()
        .then(function () {
          res.render("secrets"); //only render secrets page from login or register route
        })
        .catch(function (error) {
          console.log(error);
        });
    })
    .catch(function (error) {
      console.log(error);
    });
});

app.post("/login", (req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  User.findOne({ email: username })
    .then(function (foundUser) {
      if (foundUser) {
        bcrypt
          .compare(password, foundUser.password) //compare vs compareSync
          .then((result) => {
            if (result === true) {
              //if true, password hash matches
              res.render("secrets");
            } else {
              res.send("incorrect password");
            }
          })
          .catch(function (error) {
            console.log(error);
          });
      }
    })
    .catch(function (error) {
      console.log(error);
    });
});

app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
