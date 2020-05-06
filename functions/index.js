const functions = require("firebase-functions");

const app = require("express")();

const {
  getAllPosts,
  createPost,
  getPost,
  commentOnPost,
  likePost,
  unlikePost,
} = require("./handlers/posts");
const {
  signUp,
  logIn,
  uploadImage,
  addUserDetails,
  getAuthenticatedUser,
} = require("./handlers/users");

const FBAuth = require("./util/fbAuth");

//posts routes
app.get("/posts", getAllPosts);
app.post("/posts", FBAuth, createPost);
app.get("/post/:postId", getPost);
// delete post
// like post
app.post("/post/:postId/like", FBAuth, likePost);
// unlike post
app.post("/post/:postId/unlike", FBAuth, unlikePost);
// create comment
app.post("/post/:postId/comment", FBAuth, commentOnPost);

//users routes
app.post("/signup", signUp);
app.post("/login", logIn);

app.get("/user", FBAuth, getAuthenticatedUser);
app.post("/user", FBAuth, addUserDetails);
app.post("/user/image", FBAuth, uploadImage);

exports.api = functions.region("us-east1").https.onRequest(app);
