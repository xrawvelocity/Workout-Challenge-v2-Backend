const functions = require("firebase-functions");
const app = require("express")();
const cors = require("cors");
const FBAuth = require("./util/fbAuth");
app.use(
  cors({
    origin: function (origin, callback) {
      return callback(null, true);
    },
    optionsSuccessStatus: 200,
    credentials: true,
  })
);

const { db } = require("./util/admin");

const {
  getAllPosts,
  createPost,
  getPost,
  commentOnPost,
  likePost,
  unlikePost,
  deletePost,
} = require("./handlers/posts");
const {
  signUp,
  logIn,
  uploadImage,
  addUserDetails,
  getAuthenticatedUser,
  getUserDetails,
  markNotificationsRead,
  followUser,
  unfollowUser,
  getAllUsers,
} = require("./handlers/users");
const {
  getAllChats,
  getChat,
  createChat,
  sendMessage,
} = require("./handlers/chats");

//posts routes
app.get("/posts", getAllPosts);
app.post("/posts", FBAuth, createPost);
app.get("/post/:postId", getPost);
app.delete("/post/:postId", FBAuth, deletePost);
app.get("/post/:postId/like", FBAuth, likePost);
app.get("/post/:postId/unlike", FBAuth, unlikePost);
app.post("/post/:postId/comment", FBAuth, commentOnPost);

//users routes
app.post("/signup", signUp);
app.post("/login", logIn);
app.get("/user", FBAuth, getAuthenticatedUser);
app.post("/user", FBAuth, addUserDetails);
app.get("/users", FBAuth, getAllUsers);
app.post("/user/image", FBAuth, uploadImage);
app.get("/user/:handle", getUserDetails);
app.post("/notifications", FBAuth, markNotificationsRead);
app.get("/user/:handle/follow", FBAuth, followUser);
app.get("/user/:handle/unfollow", FBAuth, unfollowUser);

//messages routes
app.get("/chats", FBAuth, getAllChats);
app.get("/chat/:chatId", FBAuth, getChat);
app.post("/chats", FBAuth, createChat);
app.post("/chat/:chatId", FBAuth, sendMessage);

exports.api = functions.region("us-east1").https.onRequest(app);

exports.createNotificationOnLike = functions
  .region("us-east1")
  .firestore.document("likes/{id}")
  .onCreate((snapshot) => {
    return db
      .doc(`/posts/${snapshot.data().postId}`)
      .get()
      .then((doc) => {
        if (
          doc.exists &&
          doc.data().userHandle !== snapshot.data().userHandle
        ) {
          return db.doc(`/notifications/${snapshot.id}`).set({
            createdAt: new Date().toISOString(),
            recipient: doc.data().userHandle,
            sender: snapshot.data().userHandle,
            senderImage: snapshot.data().userImage,
            type: "like",
            read: false,
            postId: doc.id,
          });
        }
      })
      .catch((err) => {
        console.error(err);
      });
  });

exports.deleteNotificationOnUnlike = functions
  .region("us-east1")
  .firestore.document("likes/{id}")
  .onDelete((snapshot) => {
    return db
      .doc(`/notifications/${snapshot.id}`)
      .delete()
      .catch((err) => {
        console.error(err);
        return;
      });
  });

//otherUser = recipient || snapshot
//userHandle = sender || doc
exports.createNotificationOnFollow = functions
  .region("us-east1")
  .firestore.document("follows/{id}")
  .onCreate((snapshot) => {
    return db
      .doc(`/users/${snapshot.data().userHandle}`)
      .get()
      .then((doc) => {
        if (doc.exists && doc.data().userHandle !== snapshot.data().otherUser) {
          return db.doc(`/notifications/${snapshot.id}`).set({
            createdAt: new Date().toISOString(),
            sender: doc.data().handle,
            recipient: snapshot.data().otherUser,
            senderImage: doc.data().imageUrl,
            type: "follow",
            read: false,
            followId: doc.id,
          });
        }
      })
      .catch((err) => {
        console.error(err);
      });
  });

exports.deleteNotificationOnUnfollow = functions
  .region("us-east1")
  .firestore.document("follows/{id}")
  .onDelete((snapshot) => {
    return db
      .doc(`/notifications/${snapshot.id}`)
      .delete()
      .catch((err) => {
        console.error(err);
        return;
      });
  });

exports.createNotificationOnComment = functions
  .region("us-east1")
  .firestore.document("comments/{id}")
  .onCreate((snapshot) => {
    return db
      .doc(`/posts/${snapshot.data().postId}`)
      .get()
      .then((doc) => {
        if (
          doc.exists &&
          doc.data().userHandle !== snapshot.data().userHandle
        ) {
          return db.doc(`/notifications/${snapshot.id}`).set({
            createdAt: new Date().toISOString(),
            recipient: doc.data().userHandle,
            sender: snapshot.data().userHandle,
            senderImage: snapshot.data().userImage,
            type: "comment",
            read: false,
            postId: doc.id,
          });
        }
      })
      .catch((err) => {
        console.error(err);
        return;
      });
  });

exports.onUserImageChange = functions
  .region("us-east1")
  .firestore.document("/users/{userId}")
  .onUpdate((change) => {
    console.log(change.before.data());
    console.log(change.after.data());
    if (change.before.data().imageUrl !== change.after.data().imageUrl) {
      console.log("image has changed");
      const batch = db.batch();
      return db
        .collection("posts")
        .where("userHandle", "==", change.before.data().handle)
        .get()
        .then((data) => {
          data.forEach((doc) => {
            const post = db.doc(`/posts/${doc.id}`);
            batch.update(post, { userImage: change.after.data().imageUrl });
          });
          return db
            .collection("comments")
            .where("userHandle", "==", change.before.data().handle)
            .get();
        })

        .then((data) => {
          data.forEach((doc) => {
            const post = db.doc(`/comments/${doc.id}`);
            batch.update(post, { userImage: change.after.data().imageUrl });
          });

          return db
            .collection("chats")
            .where("userOne", "==", change.before.data().handle)
            .get();
        })
        .then((data) => {
          data.forEach((doc) => {
            const post = db.doc(`/chats/${doc.id}`);
            batch.update(post, { userOneImage: change.after.data().imageUrl });
          });

          return db
            .collection("chats")
            .where("userTwo", "==", change.before.data().handle)
            .get();
        })

        .then((data) => {
          data.forEach((doc) => {
            const post = db.doc(`/chats/${doc.id}`);
            batch.update(post, { userTwoImage: change.after.data().imageUrl });
          });

          return db
            .collection("follows")
            .where("userHandle", "==", change.before.data().handle)
            .get();
        })
        .then((data) => {
          data.forEach((doc) => {
            const post = db.doc(`/follows/${doc.id}`);
            batch.update(post, { userImage: change.after.data().imageUrl });
          });

          return db
            .collection("notifications")
            .where("sender", "==", change.before.data().handle)
            .get();
        })
        .then((data) => {
          data.forEach((doc) => {
            const post = db.doc(`/notifications/${doc.id}`);
            batch.update(post, { senderImage: change.after.data().imageUrl });
          });
          return batch.commit();
        });
    } else return true;
  });

exports.onPostDelete = functions
  .region("us-east1")
  .firestore.document("/posts/{postId}")
  .onDelete((snapshot, context) => {
    const postId = context.params.postId;
    const batch = db.batch();
    return db
      .collection("comments")
      .where("postId", "==", postId)
      .get()
      .then((data) => {
        data.forEach((doc) => {
          batch.delete(db.doc(`/comments/${doc.id}`));
        });
        return db.collection("likes").where("postId").get();
      })
      .then((data) => {
        data.forEach((doc) => {
          batch.delete(db.doc(`/likes/${doc.id}`));
        });
        return db.collection("notifications").where("postId").get();
      })
      .then((data) => {
        data.forEach((doc) => {
          batch.delete(db.doc(`/notifications/${doc.id}`));
        });
        return batch.commit();
      })
      .catch((err) => console.error(err));
  });

exports.createNotificationOnMessage = functions
  .region("us-east1")
  .firestore.document("chats/{id}")
  .on("child_changed", (snapshot) => {
    return db
      .doc(`/chats/${snapshot.data().chatId}`)
      .get()
      .then((doc) => {
        if (
          doc.exists &&
          doc.data().userOne === snapshot.data().messages[snapshot.data().messages.length - 1].userOne
        ) {
          return db.doc(`/chats/${snapshot.data().chatId}`).update({
            userTwoRead: false,
          });
        } else if (
          doc.exists &&
          doc.data().userTwo === snapshot.data().messages[snapshot.data().messages.length - 1].userTwo
        ) {
          return db.doc(`/chats/${snapshot.data().chatId}`).update({
            userOneRead: false,
          });
        }
      })
      .catch((err) => {
        console.error(err);
        return;
      });
  });
