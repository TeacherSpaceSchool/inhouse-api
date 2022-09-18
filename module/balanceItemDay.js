const BalanceItemDay = require('../models/balanceItemDay');
const BalanceItem = require('../models/balanceItem');
const {checkFloat} = require('./const');

module.exports.setBalanceItemDay = async ({store, item, warehouse, amount, diff}) => {
    let today = new Date()
    today.setHours(0,0,0,0)
    let balanceItemDay = await BalanceItemDay.findOne({
        item,
        date: today,
        warehouse
    })
    if(balanceItemDay) {
        balanceItemDay.endAmount = amount
        if(diff>0)
            balanceItemDay.plus = checkFloat(balanceItemDay.plus + diff)
        else
            balanceItemDay.minus = checkFloat(balanceItemDay.minus - diff)
        await balanceItemDay.save()
    }
    else {
        balanceItemDay = new BalanceItemDay({
            store,
            warehouse,
            item,
            startAmount: amount - diff,
            endAmount: amount,
            date: today,
            plus: 0,
            minus: 0
        });
        if(diff>0)
            balanceItemDay.plus = checkFloat(balanceItemDay.plus + diff)
        else
            balanceItemDay.minus = checkFloat(balanceItemDay.minus - diff)
        await BalanceItemDay.create(balanceItemDay);
    }
}
