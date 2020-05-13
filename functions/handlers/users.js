const { db, admin } = require("../util/admin");

const config = require("../handlers/config");

const firebase = require("firebase");
firebase.initializeApp(config);

const {
  validateSignupData,
  validateLoginData,
  reduceUserDetails,
} = require("../util/validators");

// sign user up
exports.signUp = (req, res) => {
  const newUser = {
    email: req.body.email,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
    handle: req.body.handle,
  };

  const { valid, errors } = validateSignupData(newUser);

  if (!valid) return res.status(400).json(errors);

  const noImg = "userdefault.png";

  let token, userId;
  db.doc(`/users/${newUser.handle}`)
    .get()
    .then((doc) => {
      if (doc.exists) {
        return res
          .status(400)
          .json({ handle: "This username is already taken" });
      } else {
        return firebase
          .auth()
          .createUserWithEmailAndPassword(newUser.email, newUser.password);
      }
    })
    .then((data) => {
      userId = data.user.uid;
      return data.user.getIdToken();
    })
    .then((idToken) => {
      token = idToken;
      const userCredentials = {
        handle: newUser.handle,
        email: newUser.email,
        createdAt: new Date().toISOString(),
        imageUrl: `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${noImg}?alt=media`,
        userId,
        followerCount: 0,
      };
      return db.doc(`/users/${newUser.handle}`).set(userCredentials);
    })
    .then(() => {
      return res.status(201).json({ token });
    })
    .catch((err) => {
      console.error(err);
      if (err.code === "auth/email-already-in-use") {
        return res.status(400).json({ email: "Email is already in use" });
      } else {
        return res
          .status(500)
          .json({ general: "Something went wrong, please try again" });
      }
    });
};

// log user in
exports.logIn = (req, res) => {
  const user = {
    email: req.body.email,
    password: req.body.password,
  };

  const { valid, errors } = validateLoginData(user);

  if (!valid) return res.status(400).json(errors);

  firebase
    .auth()
    .signInWithEmailAndPassword(user.email, user.password)
    .then((data) => {
      return data.user.getIdToken();
    })
    .then((token) => {
      return res.json({ token });
    })
    .catch((err) => {
      console.error(err);

      return res
        .status(403)
        .json({ general: "Wrong credentials, please try again" });
    });
};

// add user details
exports.addUserDetails = (req, res) => {
  let userDetails = reduceUserDetails(req.body);

  db.doc(`/users/${req.user.handle}`)
    .update(userDetails)
    .then(() => {
      return res.json({ message: "Details added successfully" });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

// get any user details
exports.getUserDetails = (req, res) => {
  let userData = {};
  db.doc(`/users/${req.params.handle}`)
    .get()
    .then((doc) => {
      if (doc.exists) {
        userData.user = doc.data();
        return db
          .collection("posts")
          .where("userHandle", "==", req.params.handle)
          .orderBy("createdAt", "desc")
          .get();
      } else {
        return res.status(404).json({ error: "User not found" });
      }
    })
    .then((data) => {
      userData.posts = [];
      data.forEach((doc) => {
        userData.posts.push({
          body: doc.data().body,
          createdAt: doc.data().createdAt,
          userHandle: doc.data().userHandle,
          userImage: doc.data().userImage,
          likeCount: doc.data().likeCount,
          commentCount: doc.data().commentCount,
          postId: doc.id,
        });
      });
      return db
        .collection("follows")
        .where("userHandle", "==", req.params.handle)
        .get();
    })
    .then((data) => {
      userData.following = [];
      data.forEach((doc) => {
        userData.following.push(doc.data());
      });
      return db
        .collection("follows")
        .where("otherUser", "==", req.params.handle)
        .get();
    })
    .then((data) => {
      userData.followers = [];
      data.forEach((doc) => {
        userData.followers.push(doc.data());
      });
      return res.json(userData);
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

// get own user details
exports.getAuthenticatedUser = (req, res) => {
  let userData = {};
  db.doc(`/users/${req.user.handle}`)
    .get()
    .then((doc) => {
      if (doc.exists) {
        userData.credentials = doc.data();
        return db
          .collection("likes")
          .where("userHandle", "==", req.user.handle)
          .get();
      }
    })
    .then((data) => {
      userData.likes = [];
      data.forEach((doc) => {
        userData.likes.push(doc.data());
      });
      return db
        .collection("notifications")
        .where("recipient", "==", req.user.handle)
        .orderBy("createdAt", "desc")
        .limit(10)
        .get();
    })
    .then((data) => {
      userData.notifications = [];
      data.forEach((doc) => {
        userData.notifications.push({
          recipient: doc.data().recipient,
          sender: doc.data().sender,
          senderImage: doc.data().senderImage,
          createdAt: doc.data().createdAt,
          postId: doc.data().postId,
          type: doc.data().type,
          read: doc.data().read,
          notificationId: doc.id,
        });
      });
      return db
        .collection("follows")
        .where("userHandle", "==", req.user.handle)
        .get();
    })
    .then((data) => {
      userData.following = [];
      data.forEach((doc) => {
        userData.following.push(doc.data());
      });
      return db
        .collection("follows")
        .where("otherUser", "==", req.user.handle)
        .get();
    })
    .then((data) => {
      userData.followers = [];
      data.forEach((doc) => {
        userData.followers.push(doc.data());
      });
      return res.json(userData);
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

// upload a profile image for user
exports.uploadImage = (req, res) => {
  const BusBoy = require("busboy");
  const path = require("path");
  const os = require("os");
  const fs = require("fs");

  const busboy = new BusBoy({ headers: req.headers });

  let imageFileName;
  let imageToBeUploaded = {};

  busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
    if (mimetype !== "image/jpeg" && mimetype !== "image/png") {
      return res.status(400).json({ eroor: "Wrong file type submitted" });
    }
    const imageExtension = filename.split(".")[filename.split(".").length - 1];
    imageFileName = `${Math.round(
      Math.random() * 10000000000
    )}.${imageExtension}`;
    const filepath = path.join(os.tmpdir(), imageFileName);
    imageToBeUploaded = { filepath, mimetype };
    file.pipe(fs.createWriteStream(filepath));
  });
  busboy.on("finish", () => {
    admin
      .storage()
      .bucket()
      .upload(imageToBeUploaded.filepath, {
        resumable: false,
        metadata: {
          metadata: {
            contentType: imageToBeUploaded.mimetype,
          },
        },
      })
      .then(() => {
        const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media`;
        return db.doc(`/users/${req.user.handle}`).update({ imageUrl });
      })
      .then(() => {
        return res.json({ message: "Image uploaded successfully" });
      })
      .catch((err) => {
        console.error(err);
        return res.status(500).json({ error: err.code });
      });
  });
  busboy.end(req.rawBody);
};

exports.markNotificationsRead = (req, res) => {
  let batch = db.batch();
  req.body.forEach((notificationId) => {
    const notification = db.doc(`/notifications/${notificationId}`);
    batch.update(notification, { read: true });
  });
  batch
    .commit()
    .then(() => {
      return res.json({ message: "Notifications marked read" });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

// follow a user
exports.followUser = (req, res) => {
  const followDocument = db
    .collection("follows")
    .where("userHandle", "==", req.user.handle)
    .where("userImage", "==", req.user.imageUrl)
    .where("otherUser", "==", req.params.handle)
    .limit(1);

  const userDocument = db.doc(`/users/${req.params.handle}`);

  let userData;

  userDocument
    .get()
    .then((doc) => {
      if (doc.exists) {
        userData = doc.data();
        userData.handle = doc.id;
        return followDocument.get();
      } else {
        return res.status(404).json({ error: "User not found" });
      }
    })
    .then((data) => {
      if (data.empty) {
        return db
          .collection("follows")
          .add({
            otherUser: req.params.handle,
            otherUserImage: userData.imageUrl,
            userHandle: req.user.handle,
            userImage: req.user.imageUrl
          })
          .then(() => {
            userData.followerCount++;
            return userDocument.update({
              followerCount: userData.followerCount,
            });
          })
          .then(() => {
            return res.json(userData);
          });
      } else {
        return res.status(400).json({ error: "User already followed" });
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};

exports.unfollowUser = (req, res) => {
  const followDocument = db
    .collection("follows")
    .where("userHandle", "==", req.user.handle)
    .where("userImage", "==", req.user.imageUrl)
    .where("otherUser", "==", req.params.handle)
    .limit(1);

  const userDocument = db.doc(`/users/${req.params.handle}`);

  let userData;

  userDocument
    .get()
    .then((doc) => {
      if (doc.exists) {
        userData = doc.data();
        userData.handle = doc.id;
        return followDocument.get();
      } else {
        return res.status(404).json({ error: "User not found" });
      }
    })
    .then((data) => {
      if (data.empty) {
        return res.status(400).json({ error: "User not followed" });
      } else {
        return db
          .doc(`/follows/${data.docs[0].id}`)
          .delete()
          .then(() => {
            userData.followerCount--;
            return userDocument.update({
              followerCount: userData.followerCount,
            });
          })
          .then(() => {
            return res.json(userData);
          });
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};

exports.getAllUsers = (req, res) => {
  db.collection("users")
    .get()
    .then((data) => {
      let users = [];
      data.forEach((doc) => {
        users.push({
          handle: doc.id,
          bio: doc.data().bio,
          createdAt: doc.data().created,
          email: doc.data().email,
          followerCount: doc.data().follower,
          imageUrl: doc.data().imageUrl,
          location: doc.data().location,
          userId: doc.data().userId,
          website: doc.data().website,
        });
      });
      return res.json(users);
    })
    .catch((err) => console.error(err));
};
