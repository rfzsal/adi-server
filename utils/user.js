const { getFirestore } = require('firebase-admin/firestore');

/**
 * Remove invalid FCM tokens
 * @param {*} userId User ID
 * @param {*} FCMTokens Invalid FCM tokens
 * @returns True
 */
exports.updateUser = async (userId, data) => {
  try {
    const firestore = getFirestore();

    const userRef = firestore.collection('users').doc(userId);

    userRef.update({ ...data });

    return true;
  } catch (error) {
    return { error };
  }
};
