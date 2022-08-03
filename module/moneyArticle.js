const MoneyArticle = require('../models/moneyArticle');

module.exports.reductionMoneyArticle = async () => {
    let name = 'Трансфер между кассами'
    let findObject = await MoneyArticle.findOne({name}).lean();
    if(!findObject){
        findObject = new MoneyArticle({name});
        await MoneyArticle.create(findObject);
    }
}
