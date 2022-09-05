const midtrans = require('../utils/midtrans');
const transactions = require('../utils/transactions');
const messages = require('../utils/messages');
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

  const currentTimestamp = Date.now();
  const chatRoomId = `${user.id}-${product.id}`;
  const chatRoom = {
    name: product.name,
    image: product.image,
    users: [user],
    latestMessage: {
      text: 'Sesi konsultasi akan segera dimulai',
      sender: 'System',
      timestamp: currentTimestamp
    },
    duration: product.duration,
    expiredAt: 0
  };

  if (transactionStatus === 'capture') {
    if (fraudStatus === 'challenge') {
      await transactions.update(transactionId, 'Transaksi Gagal');
      notifications.send(user.id, {
        id: transactionId,
        title: 'Transaksi Gagal',
        body: `Transaksi untuk ${product.name} gagal`,
        type: 'information'
      });
    } else if (fraudStatus === 'accept') {
      await transactions.update(transactionId, 'Transaksi Berhasil');
      messages.create(chatRoomId, chatRoom);
      notifications.send(user.id, {
        id: transactionId,
        title: 'Transaksi Berhasil',
        body: `Transaksi untuk ${product.name} berhasil`,
        type: 'information'
      });
    }
  } else if (transactionStatus === 'settlement') {
    await transactions.update(transactionId, 'Transaksi Berhasil');
    messages.create(chatRoomId, chatRoom);
    notifications.send(user.id, {
      id: transactionId,
      title: 'Transaksi Berhasil',
      body: `Transaksi untuk ${product.name} berhasil`,
      type: 'information'
    });
  } else if (transactionStatus === 'cancel' || transactionStatus == 'deny') {
    await transactions.update(transactionId, 'Transaksi Gagal');
    notifications.send(user.id, {
      id: transactionId,
      title: 'Transaksi Gagal',
      body: `Transaksi untuk ${product.name} gagal`,
      type: 'information'
    });
  } else if (transactionStatus === 'pending') {
    await transactions.update(transactionId, 'Menunggu Pembayaran');
    notifications.send(user.id, {
      id: transactionId,
      title: 'Menunggu Pembayaran',
      body: `Transaksi untuk ${product.name} sedang menunggu pembayaran`,
      type: 'information'
    });
  } else if (transactionStatus === 'expire') {
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
