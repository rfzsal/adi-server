const transactions = require('../utils/transactions');

exports.getCurrentYear = async (req, res) => {
  const { grouped } = req.query;

  const transactionsData = await transactions.getCurrentYear(
    grouped === 'true' ? true : false
  );

  res.status(200).send({
    message: 'Get transactions success',
    data: transactionsData
  });
};
