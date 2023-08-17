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
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const FacebookStrategy = require("passport-facebook");
const findOrCreate = require("mongoose-findorcreate");

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
  googleId: String,
  facebookId: String,
  username: String,
  secret: String,
});

//add plugin to mongoose schema, it has to be a mongoose schema not regular js object
userSchema.plugin(passportLocalMongoose);
// add findorcreate as pluggin
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

// CHANGE: USE "createStrategy" INSTEAD OF "authenticate"
passport.use(User.createStrategy());
//https://www.passportjs.org/concepts/authentication/
passport.serializeUser(function (user, cb) {
  process.nextTick(function () {
    return cb(null, {
      id: user.id,
      username: user.username,
      picture: user.picture,
    });
  });
});

passport.deserializeUser(function (user, cb) {
  process.nextTick(function () {
    return cb(null, user);
  });
});

//Google Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/secrets",
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    function (accessToken, refreshToken, profile, cb) {
      console.log(profile); //log their profile
      User.findOrCreate(
        { googleId: profile.id, username: profile.id },
        function (err, user) {
          //find user by google Id
          return cb(err, user);
        }
      );
    }
  )
);
//Facebook Stratgery
passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      callbackURL: "http://localhost:3000/auth/facebook/secrets",
    },
    function (accessToken, refreshToken, profile, cb) {
      User.findOrCreate(
        { facebookId: profile.id, username: profile.id },
        function (err, user) {
          return cb(err, user);
        }
      );
    }
  )
);

app.get("/", (req, res) => {
  res.render("home");
});

//Google route
app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile"] })
);

//Google route
app.get(
  "/auth/google/secrets",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function (req, res) {
    // Successful authentication, redirect home.
    res.redirect("/secrets");
  }
);

//Facebook route
app.get("/auth/facebook", passport.authenticate("facebook"));

//Facebook route
app.get(
  "/auth/facebook/secrets",
  passport.authenticate("facebook", { failureRedirect: "/login" }),
  function (req, res) {
    // Successful authentication, redirect home.
    res.redirect("/secrets");
  }
);

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
  //show all secrets
  User.find({ secret: { $ne: null } }).then(function (foundUsers) {
    //console.log("found users");
    if (foundUsers) {
      res.render("secrets", { usersWithSecrets: foundUsers });
    }
  });
});

app.get("/submit", function (req, res) {
  if (req.isAuthenticated()) {
    res.render("submit");
  } else {
    res.redirect("/login");
    console.log(req.isAuthenticated());
  }
});

app.post("/submit", function (req, res) {
  User.findById(req.user.id)
    .then(function (foundUser) {
      foundUser.secret = req.body.secret;
      foundUser.save();
      console.log("secret saved");
      res.redirect("/secrets");
    })
    .catch(function (err) {
      console.log("error");
    });
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
