const MoneyArticle = require('../models/moneyArticle');

module.exports.createMoneyArticle = async () => {
    let findMoneyArticle = await MoneyArticle.findOne({name: 'Не указано'});
    if(!findMoneyArticle){
        findMoneyArticle = new MoneyArticle({
            name: 'Не указано'
        });
        await MoneyArticle.create(findMoneyArticle);
    }
    else if(findMoneyArticle.del) {
        findMoneyArticle.del = false
        await findMoneyArticle.save()
    }
    findMoneyArticle = await MoneyArticle.findOne({name: 'Зарплата'});
    if(!findMoneyArticle){
        findMoneyArticle = new MoneyArticle({
            name: 'Зарплата'
        });
        await MoneyArticle.create(findMoneyArticle);
    }
    else if(findMoneyArticle.del) {
        findMoneyArticle.del = false
        await findMoneyArticle.save()
    }
}
