const { format, addMinutes } = require('date-fns');

const midtrans = require('../utils/midtrans');
const transactions = require('../utils/transactions');

const paymentTimeout = process.env.PAYMENT_TIMEOUT;

/**
 * Create midtrans payment url
 */
exports.create = async (req, res) => {
  const {
    transaction_details,
    item_details,
    customer_details,
    enabled_payments
  } = req.body.parameter;

  const { product, user, payment } = req.body.transaction;
  const userId = user.id;

  if (
    !req.body.parameter ||
    !req.body.transaction ||
    !transaction_details ||
    !item_details ||
    !customer_details ||
    !enabled_payments ||
    !product ||
    !user ||
    !payment
  ) {
    res.status(400).send({
      error: 'Invalid data',
      code: '400',
      message: 'Transaction data required'
    });
    return;
  }

  const currentTimestamp = Date.now();

  const transactionId = (
    currentTimestamp +
    Math.floor(Math.random() * 900000) +
    100000
  ).toString();

  const createdAt = format(currentTimestamp, 'yyyy-MM-dd HH:mm:ss xx');

  const parameter = {
    transaction_details: {
      ...transaction_details,
      order_id: transactionId
    },
    item_details,
    customer_details,
    enabled_payments,
    credit_card: { secure: true, save_card: true },
    user_id: userId,
    callbacks: { finish: '?finish' },
    expiry: {
      start_time: createdAt,
      unit: 'minutes',
      duration: paymentTimeout
    },
    custom_field1: JSON.stringify(product),
    custom_field2: JSON.stringify(user)
  };

  const url = await midtrans.create(parameter);
  if (url.error) {
    console.log('Transaction update error: ', url.error);

    res.status(500).send({
      error: 'Server error',
      code: '500',
      message:
        'Transaction update error, please contact your server admin for detailed information'
    });
    return;
  }

  const transaction = {
    product: {
      ...product
    },
    user: {
      ...user
    },
    payment: {
      ...payment,
      link: url,
      createdAt: currentTimestamp,
      expiredAt: addMinutes(currentTimestamp, paymentTimeout).getTime()
    }
  };

  const status = await transactions.create(transactionId, transaction);
  if (status.error) {
    console.log('Transaction update error: ', status.error);

    res.status(500).send({
      error: 'Server error',
      code: '500',
      message:
        'Transaction update error, please contact your server admin for detailed information'
    });
    return;
  }

  res.status(200).send({ message: 'Transaction created', data: url });
};
