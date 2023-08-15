//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const port = 3000;
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));

//initialize session
app.use(
  session({
    secret: "our little secret",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }, //resolve not redirect to secrets page
  })
);

//initialize passport
app.use(passport.initialize());
app.use(passport.session());

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

//add plugin to mongoose schema, it has to be a mongoose schema not regular js object
userSchema.plugin(passportLocalMongoose);

const User = new mongoose.model("User", userSchema);

// CHANGE: USE "createStrategy" INSTEAD OF "authenticate"
passport.use(User.createStrategy());
// use static serialize and deserialize of model for passport session support
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.get("/", (req, res) => {
  res.render("home");
});

app.get("/login", (req, res) => {
  if (req.isAuthenticated()) {
    //if already logged-in
    res.redirect("/secrets");
  } else {
    res.render("login");
  }
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.get("/secrets", function (req, res) {
  if (req.isAuthenticated()) {
    res.render("secrets");
  } else {
    res.redirect("/login");
    console.log(req.isAuthenticated());
  }
});

app.get("/logout", function (req, res) {
  //from passport.js documentation
  req.logout(function (err) {
    if (err) {
      console.log(err);
    } else {
      res.redirect("/");
    }
  });
});

app.post("/register", (req, res) => {
  User.register(
    //from passport-local-mongoose package
    { username: req.body.username },
    req.body.password,
    function (err, user) {
      if (err) {
        console.log(err);
        res.redirect("/register");
      } else {
        passport.authenticate("local")(req, res, function () {
          res.redirect("/secrets");
        });
      }
    }
  );
});

app.post("/login", (req, res) => {
  const user = new User({
    username: req.body.username,
    password: req.body.password,
  });

  //use passport to login this user
  req.login(user, function (err) {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function () {
        res.redirect("/secrets");
      });
    }
  });
});

app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
