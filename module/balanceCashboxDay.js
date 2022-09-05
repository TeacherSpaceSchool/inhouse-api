const BalanceCashboxDay = require('../models/balanceCashboxDay');
const Cashbox = require('../models/cashbox');
const {checkFloat} = require('./const');

module.exports.createTestBalanceCashboxDay = async () => {
    await BalanceCashboxDay.deleteMany()
    let object
    let today = new Date()
    today.setHours(0, 0, 0, 0)
    let date = new Date(today)
    let cashboxes = await Cashbox.find({del: {$ne: true}}).select('_id balance store').lean()
    for(let i = 0; i < 3; i++) {
        for(let i1 = 0; i1 < cashboxes.length; i1++) {
            object = await BalanceCashboxDay.findOne({
                cashbox: cashboxes[i1]._id,
                store: cashboxes[i1].store,
                date
            })
            if(!object) {
                object = new BalanceCashboxDay({
                    cashbox: cashboxes[i1]._id,
                    startBalance: cashboxes[i1].balance,
                    endBalance: cashboxes[i1].balance,
                    store: cashboxes[i1].store,
                    date
                });
                await BalanceCashboxDay.create(object);
            }
        }
        date.setDate(date.getDate()+1)
    }
}

module.exports.setBalanceCashboxDay = async ({cashbox, newAmount, oldAmount, currency, operation, date}) => {
    let balanceCashboxDays = await BalanceCashboxDay.find({
        cashbox: cashbox,
        date: {$gte: date}
    })
        .select('_id startBalance endBalance')
        .sort('createdAt')
        .lean()
    let index
    for(let i = 0; i < balanceCashboxDays.length; i++) {
        if(i) {
            index = undefined
            for (let i1 = 0; i1 < balanceCashboxDays[i].startBalance.length; i1++) {
                if (balanceCashboxDays[i].startBalance[i1].currency === currency) {
                    index = i1
                    break
                }
            }
            if(index===undefined) {
                if (operation === 'приход')
                    balanceCashboxDays[i].startBalance = [
                        {
                            currency,
                            amount: newAmount
                        },
                        ...balanceCashboxDays[i].startBalance
                    ]
                else
                    balanceCashboxDays[i].startBalance = [
                        {
                            currency,
                            amount: -newAmount
                        },
                        ...balanceCashboxDays[i].startBalance
                    ]
            }
            else {
                if (operation === 'приход')
                    balanceCashboxDays[i].startBalance[index].amount = checkFloat(balanceCashboxDays[i].startBalance[index].amount + newAmount - oldAmount)
                else
                    balanceCashboxDays[i].startBalance[index].amount = checkFloat(balanceCashboxDays[i].startBalance[index].amount - newAmount + oldAmount)
            }
        }
        index = undefined
        for(let i1=0; i1<balanceCashboxDays[i].endBalance.length; i1++) {
            if (balanceCashboxDays[i].endBalance[i1].currency === currency) {
                index = i1
                break
            }
        }
        if(index===undefined) {
            if (operation === 'приход')
                balanceCashboxDays[i].endBalance = [
                    {
                        currency,
                        amount: newAmount
                    },
                    ...balanceCashboxDays[i].endBalance
                ]
            else
                balanceCashboxDays[i].endBalance = [
                    {
                        currency,
                        amount: -newAmount
                    },
                    ...balanceCashboxDays[i].endBalance
                ]
        }
        else {
            if (operation === 'приход')
                balanceCashboxDays[i].endBalance[index].amount = checkFloat(balanceCashboxDays[i].endBalance[index].amount + newAmount - oldAmount)
            else
                balanceCashboxDays[i].endBalance[index].amount = checkFloat(balanceCashboxDays[i].endBalance[index].amount - newAmount + oldAmount)
        }
        await BalanceCashboxDay.updateOne({_id: balanceCashboxDays[i]._id}, {startBalance: balanceCashboxDays[i].startBalance, endBalance: balanceCashboxDays[i].endBalance})
    }
}
