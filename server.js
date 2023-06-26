import { createServer } from "http";
import { Server } from 'socket.io';
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import session from "express-session";
import fileUpload from "express-fileupload";
import dotenv from "dotenv";
import cookieParser from 'cookie-parser';
dotenv.config();

//Read the current directory name
const hostname = "127.0.0.1";
const PORT = process.env.PORT || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const server = createServer(app);
const io = new Server(server);
app.use(cookieParser());
app.use(
  session({ secret: "Your_Secret_Key", resave: false, saveUninitialized: true ,
   cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 1 day
  },})
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use("/public", express.static(__dirname + "/public"));
app.use(fileUpload({
  limits: {
      fileSize: 3 * 1024 * 1024 // 3 MB
  },
  abortOnLimit: true
}));
//connection database
if (process.env.MONGODB_URI) {
  mongoose
    .connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .then(() => {
      console.log("Connected to DB");
    })
    .catch((err) => {
      console.log("Error connecting to DB:", err.message);
    });
} else {
  console.error(
    "process.env.MONGODB_URI not set. Please provide a valid database connection string."
  );
}


app.get("/", async (req, res) => {
  const products = await Product.find();
  //if there is no cart, create one
  const cats = await Product.find().distinct("category");
  //render the index page
  res.render("pages/route", {
    path: "/index", //the path that user entered
    title: "Home", //the title of the page
    cats, //the categories
    user: req.session.user, //the user
    cart: req.session.cart, //the cart
    products,
  });
});

app.get("/:route", async (req, res) => {
  const title = {
    signin: "Sign In",
    signup: "Sign Up",
    about: "About Us",
    contact: "Contact Us",
    search: "Search",
    chat:"Chat",
  };
  const cats = await Product.find().distinct("category"); //["Pants,Shitrs","Hoodie"]
  res.render("pages/route", {
    path: req.params.route.toLowerCase(), //the path that user entered
    title: title[req.params.route], //the title of the page
    cats, //the categories 
    user: req.session.user, //the user
    cart: req.session.cart, //the cart
  });
});

app.use(async (req, res) => {
  const cats = await Product.find().distinct("category"); //["Pants,Shitrs","Hoodie"]
  res.status(404).render("pages/route", {
    path: "404", //the path that user entered
    title: "Page Not Found", //the title of the page
    cats, //the categories
    user: req.session.user, //the user
    cart: req.session.cart, //the cart
  });
});

io.on("connection", function (socket) {
  socket.on("newuser", function (username) {
    socket.broadcast.emit("update", username + " joined the conversation");
  });

  socket.on("exituser", function (username) {
    socket.broadcast.emit("update", username + " left the conversation");
  });

  socket.on("chat", function (message) {
    socket.broadcast.emit("chat", message);
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://${hostname}:${PORT}`);
});


