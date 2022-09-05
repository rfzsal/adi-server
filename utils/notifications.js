const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');

/**
 * Remove invalid FCM tokens
 * @param {*} userId User ID
 * @param {*} FCMTokens Invalid FCM tokens
 * @returns True
 */
const removeInvalidToken = async (userId, FCMTokens) => {
  try {
    const firestore = getFirestore();

    const userRef = firestore.collection('users').doc(userId);

    FCMTokens.forEach((token) =>
      userRef.update({ FCMTokens: FieldValue.arrayRemove(token) })
    );

    return true;
  } catch (error) {
    return { error };
  }
};

/**
 * Send FCM notification
 * @param {*} userId User ID
 * @param {*} notification Notification data
 * @returns True
 */
exports.send = async (userId, notification) => {
  try {
    const firestore = getFirestore();
    const messaging = getMessaging();

    const userRef = firestore.collection('users').doc(userId);
    const user = (await userRef.get()).data();

    if (user) {
      if (user.FCMTokens?.length > 0) {
        const response = await messaging.sendToDevice(user.FCMTokens, {
          data: {
            notification: JSON.stringify(notification)
          }
        });

        const FCMTokens = user.FCMTokens;
        const invalidFCMTokens = [];

        response.results.forEach((result, index) => {
          const error = result.error;
          if (error) {
            if (
              error.code === 'messaging/invalid-registration-token' ||
              error.code === 'messaging/registration-token-not-registered'
            ) {
              invalidFCMTokens.push(FCMTokens[index]);
            }
          }
        });

        removeInvalidToken(userId, invalidFCMTokens);
      }
    }

    return true;
  } catch (error) {
    return { error };
  }
};

/**
 * Send FCM notification to topic
 * @param {*} topic Notification topic
 * @param {*} notification Notification data
 * @returns True
 */
exports.sendTopic = async (topic, notification) => {
  try {
    const messaging = getMessaging();

    await messaging.sendToTopic(topic, {
      data: {
        notification: JSON.stringify(notification)
      }
    });

    return true;
  } catch (error) {
    return { error };
  }
};
