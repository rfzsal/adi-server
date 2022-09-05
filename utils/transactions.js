const {
  getMonth,
  getYear,
  format,
  getTime,
  endOfYear,
  startOfYear
} = require('date-fns');
const { getFirestore } = require('firebase-admin/firestore');
const { id } = require('date-fns/locale');

const groupByMonth = (array) => {
  const groupedData = {};

  array.forEach((data) => {
    const createdAt = data.payment.createdAt;
    const month = getMonth(createdAt);
    const year = getYear(createdAt);

    const firstDayOfMonth = new Date(year, month, 1, 0, 0, 0);
    const key = getTime(firstDayOfMonth);

    if (year === getYear(Date.now())) {
      if (!groupedData[key]) groupedData[key] = [];
      groupedData[key].push(data);
    }
  });

  return Object.keys(groupedData).map((key) => {
    return {
      timestamp: key,
      month: format(Number(key), 'MMMM', { locale: id }),
      data: groupedData[key]
    };
  });
};

/**
 * Create transaction data
 * @param {*} transactionId Transaction ID
 * @param {*} transaction Transaction data
 * @returns True
 */
exports.create = async (transactionId, transaction) => {
  try {
    const firestore = getFirestore();

    await firestore
      .collection('transactions')
      .doc(transactionId)
      .set(transaction);

    return true;
  } catch (error) {
    return { error };
  }
};

/**
 * Update transaction status
 * @param {*} transactionId Transaction ID
 * @param {*} status Transaction status
 * @returns True
 */
exports.update = async (transactionId, status) => {
  try {
    const firestore = getFirestore();

    await firestore.collection('transactions').doc(transactionId).update({
      'payment.status': status
    });

    return true;
  } catch (error) {
    return { error };
  }
};

exports.getCurrentYear = async (grouped = false) => {
  try {
    const firestore = getFirestore();

    const currentTimestamp = Date.now();

    const timestampStartOfYear = getTime(startOfYear(currentTimestamp));
    const timestampEndOfYear = getTime(endOfYear(currentTimestamp));

    const transactionsData = await firestore
      .collection('transactions')
      .where('payment.createdAt', '>=', timestampStartOfYear)
      .where('payment.createdAt', '<=', timestampEndOfYear)
      .get();

    if (grouped) {
      return transactionsData.empty
        ? []
        : groupByMonth(transactionsData.docs.map((data) => data.data()));
    } else {
      return transactionsData.empty
        ? []
        : transactionsData.docs.map((data) => data.data());
    }
  } catch (error) {
    return { error };
  }
};
