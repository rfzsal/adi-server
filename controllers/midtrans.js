const midtrans = require('../utils/midtrans');
const { updateUser } = require('../utils/user');
const transactions = require('../utils/transactions');
const notifications = require('../utils/notifications');

/**
 * Handle midtrans webhook
 */
exports.handle = async (req, res) => {
  const rawData = await midtrans.getNotification(req.body);
  if (rawData.error) {
    console.log('Transaction update error: ', rawData.error);

    res.status(500).send({
      error: 'Server error',
      code: '500',
      message:
        'Transaction update error, please contact your server admin for detailed information'
    });
    return;
  }

  const transactionId = rawData.order_id;
  const transactionStatus = rawData.transaction_status;
  const fraudStatus = rawData.fraud_status;
  const product = JSON.parse(rawData.custom_field1);
  const user = JSON.parse(rawData.custom_field2);

  if (transactionStatus === 'capture') {
    if (fraudStatus === 'challenge') {
      await updateUser(user.id, {
        name: user.name,
        university: user.university,
        ADIMember: 0
      });
      await transactions.update(transactionId, 'Transaksi Gagal');
      notifications.send(user.id, {
        id: transactionId,
        title: 'Transaksi Gagal',
        body: `Transaksi untuk ${product.name} gagal`,
        type: 'information'
      });
    } else if (fraudStatus === 'accept') {
      await updateUser(user.id, {
        name: user.name,
        university: user.university,
        ADIMember: Date.now + 31560000000000
      });
      await transactions.update(transactionId, 'Transaksi Berhasil');
      notifications.send(user.id, {
        id: transactionId,
        title: 'Transaksi Berhasil',
        body: `Transaksi untuk ${product.name} berhasil`,
        type: 'information'
      });
    }
  } else if (transactionStatus === 'settlement') {
    await updateUser(user.id, {
      name: user.name,
      university: user.university,
      ADIMember: Date.now + 31560000000000
    });
    await transactions.update(transactionId, 'Transaksi Berhasil');
    notifications.send(user.id, {
      id: transactionId,
      title: 'Transaksi Berhasil',
      body: `Transaksi untuk ${product.name} berhasil`,
      type: 'information'
    });
  } else if (transactionStatus === 'cancel' || transactionStatus == 'deny') {
    await updateUser(user.id, {
      name: user.name,
      university: user.university,
      ADIMember: 0
    });
    await transactions.update(transactionId, 'Transaksi Gagal');
    notifications.send(user.id, {
      id: transactionId,
      title: 'Transaksi Gagal',
      body: `Transaksi untuk ${product.name} gagal`,
      type: 'information'
    });
  } else if (transactionStatus === 'pending') {
    await updateUser(user.id, {
      name: user.name,
      university: user.university,
      ADIMember: 0
    });
    await transactions.update(transactionId, 'Menunggu Pembayaran');
    notifications.send(user.id, {
      id: transactionId,
      title: 'Menunggu Pembayaran',
      body: `Transaksi untuk ${product.name} sedang menunggu pembayaran`,
      type: 'information'
    });
  } else if (transactionStatus === 'expire') {
    await updateUser(user.id, {
      name: user.name,
      university: user.university,
      ADIMember: 0
    });
    await transactions.update(transactionId, 'Transaksi Kadaluarsa');
    notifications.send(user.id, {
      id: transactionId,
      title: 'Transaksi Kadaluarsa',
      body: `Transaksi untuk ${product.name} telah kadaluarsa`,
      type: 'information'
    });
  }

  res.status(200).send('Ok');
};
