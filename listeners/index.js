const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const notifications = require('../utils/notifications');
const midtrans = require('../utils/midtrans');
const messages = require('../utils/messages');

module.exports = () => {
  const firestore = getFirestore();

  /**
   * Handle notifications
   */
  firestore.collection('notifications').onSnapshot((snapshot) => {
    if (snapshot.empty) {
      return;
    }

    snapshot.docChanges().forEach((change) => {
      // Send notification and update chat room data
      if (change.type === 'added') {
        const { id, sender, receiver, message } = change.doc.data();

        firestore
          .collection('users')
          .doc(receiver)
          .collection('chatRooms')
          .doc(id)
          .update({
            latestMessage: {
              text: message.text,
              sender,
              timestamp: message.timestamp
            },
            counter: FieldValue.increment(1)
          });

        notifications.send(receiver, {
          id,
          title: message.title,
          body: message.text,
          type: 'message'
        });

        change.doc.ref.delete().catch(() => {});
      }
    });
  });

  /**
   * Handle transactions
   */
  firestore.collection('transactions').onSnapshot((snapshot) => {
    if (snapshot.empty) {
      return;
    }

    // Cancel transaction
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'modified') {
        if (change.doc.data().payment.status === 'cancel') {
          midtrans.cancel(change.doc.id);
        }
      }
    });
  });

  /**
   * Handle pending chatrooms (orders)
   */
  firestore.collection('pendingChatRooms').onSnapshot((snapshot) => {
    if (snapshot.empty) {
      return;
    }

    snapshot.docChanges().forEach((change) => {
      // Accept order
      if (change.type === 'modified') {
        if (change.doc.data().status === 'accept') {
          const pendingChatRoom = change.doc.data();

          messages.acceptPending(pendingChatRoom).then(() => {
            notifications.send(pendingChatRoom.users[0].id, {
              id: pendingChatRoom.id,
              title: pendingChatRoom.name,
              body: `Sesi ${pendingChatRoom.name} sudah dimulai`,
              type: 'message'
            });

            notifications.send(pendingChatRoom.users[1].id, {
              id: pendingChatRoom.id,
              title: pendingChatRoom.name,
              body: `Sesi ${pendingChatRoom.name} sudah dimulai`,
              type: 'message'
            });
          });
        }
      }

      // New order notification
      if (change.type === 'added') {
        const pendingChatRoom = change.doc.data();

        notifications.sendTopic('new-orders', {
          title: 'Pesanan Baru',
          body: `Pesanan ${pendingChatRoom.name} sedang menunggu konfirmasi`,
          type: 'information'
        });
      }
    });
  });
};
