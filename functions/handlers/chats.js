const { db } = require("../util/admin");
exports.getAllChats = (req, res) => {
  db.collection("chats")
    .get()
    .then((data) => {
      let chats = [];
      data.forEach((doc) => {
        if (
          doc.data().userOne === req.user.handle ||
          doc.data().userTwo === req.user.handle
        ) {
          chats.push({
            chatId: doc.id,
            userOne: doc.data().userOne,
            userOneImage: doc.data().userOneImage,
            userTwo: doc.data().userTwo,
            userTwoImage: doc.data().userTwoImage,
            messages: doc.data().messages,
            createdAt: doc.data().createdAt,
          });
        }
      });
      return res.json(chats);
    })
    .catch((err) => console.error(err));
};
exports.createChat = (req, res) => {
  const newChat = {
    userOne: req.user.handle,
    userOneImage: req.user.imageUrl,
    userTwo: req.body.userTwoHandle,
    userTwoImage: req.body.userTwoImageUrl,
    messages: [],
    createdAt: new Date().toISOString(),
  };

  db.collection("chats")
    .where("userOne", "==", req.body.userTwoHandle)
    .get()
    .then((snapshot) => {
      if (snapshot.empty) {
        db.collection("chats")
          .where("userTwo", "==", req.body.userTwoHandle)
          .get()
          .then((secondSnapshot) => {
            if (secondSnapshot.empty) {
              db.collection("chats")
                .add(newChat)
                .then((doc) => {
                  const resChat = newChat;
                  resChat.chatId = doc.id;
                  res.json({ message: `chat ${doc.id} created successfully` });
                })
                .catch((err) => {
                  console.error(err);
                  res.status(500).json({ error: "something went wrong" });
                });
            } else {
              res.status(400).json({ chat: "This chat already exists" });
            }
          });
      } else {
        res.status(400).json({ chat: "This chat already exists" });
      }
    });
};
exports.getChat = (req, res) => {
  let chatData = {};
  db.doc(`chats/${req.params.chatId}`)
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: "Chat not found" });
      }
      chatData = doc.data();
      chatData.chatId = doc.id;
      return res.json(chatData);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: "something went wrong" });
    });
};
exports.sendMessage = (req, res) => {
  if (req.body.body.trim() === "") {
    return res.status(400).json({ message: "Must not be empty" });
  }
  const newMessage = {
    body: req.body.body,
    sender: req.user.handle,
    receiver: req.body.handle,
    createdAt: new Date().toISOString(),
  };
  db.doc(`/chats/${req.params.chatId}`)
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: "Chat not found" });
      }
      const allMessages = [...doc.data().messages, newMessage];
      return doc.ref.update({ messages: allMessages });
    })
    .then(() => {
      res.json(newMessage);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: "something went wrong" });
    });
};
