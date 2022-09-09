const BalanceCashboxDay = require('../models/balanceCashboxDay');
const Cashbox = require('../models/cashbox');
const {checkFloat, cloneObject} = require('./const');

module.exports.createTestBalanceCashboxDay = async () => {
    //await BalanceCashboxDay.deleteMany()
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
    let store = (await Cashbox.findById(cashbox).select('store').lean()).store
    let today = new Date()
    today.setHours(0,0,0,0)
    let balanceCashboxDay, lastBalanceCashboxDay, index
    while(date<=today) {
        balanceCashboxDay = await BalanceCashboxDay.findOne({
            cashbox,
            date
        })
            .select('_id startBalance endBalance')
            .sort('createdAt')
            .lean()
        if(!balanceCashboxDay) {
            balanceCashboxDay = new BalanceCashboxDay({
                cashbox,
                startBalance: [],
                endBalance: [],
                store,
                date
            });
            balanceCashboxDay = await BalanceCashboxDay.create(balanceCashboxDay);
        }
        if(lastBalanceCashboxDay) {
            index = undefined
            for (let i1 = 0; i1 < balanceCashboxDay.startBalance.length; i1++) {
                if (balanceCashboxDay.startBalance[i1].currency === currency) {
                    index = i1
                    break
                }
            }
            if(index===undefined) {
                if (operation === 'приход')
                    balanceCashboxDay.startBalance = [
                        {
                            currency,
                            amount: newAmount
                        },
                        ...balanceCashboxDay.startBalance
                    ]
                else
                    balanceCashboxDay.startBalance = [
                        {
                            currency,
                            amount: -newAmount
                        },
                        ...balanceCashboxDay.startBalance
                    ]
            }
            else {
                if (operation === 'приход')
                    balanceCashboxDay.startBalance[index].amount = checkFloat(balanceCashboxDay.startBalance[index].amount + newAmount - oldAmount)
                else
                    balanceCashboxDay.startBalance[index].amount = checkFloat(balanceCashboxDay.startBalance[index].amount - newAmount + oldAmount)
            }
        }
        index = undefined
        for(let i1=0; i1<balanceCashboxDay.endBalance.length; i1++) {
            if (balanceCashboxDay.endBalance[i1].currency === currency) {
                index = i1
                break
            }
        }
        if(index===undefined) {
            if (operation === 'приход')
                balanceCashboxDay.endBalance = [
                    {
                        currency,
                        amount: newAmount
                    },
                    ...balanceCashboxDay.endBalance
                ]
            else
                balanceCashboxDay.endBalance = [
                    {
                        currency,
                        amount: -newAmount
                    },
                    ...balanceCashboxDay.endBalance
                ]
        }
        else {
            if (operation === 'приход')
                balanceCashboxDay.endBalance[index].amount = checkFloat(balanceCashboxDay.endBalance[index].amount + newAmount - oldAmount)
            else
                balanceCashboxDay.endBalance[index].amount = checkFloat(balanceCashboxDay.endBalance[index].amount - newAmount + oldAmount)
        }
        console.log(JSON.stringify({startBalance: balanceCashboxDay.startBalance, endBalance: balanceCashboxDay.endBalance}))
        await BalanceCashboxDay.updateOne({_id: balanceCashboxDay._id}, {startBalance: balanceCashboxDay.startBalance, endBalance: balanceCashboxDay.endBalance})
        lastBalanceCashboxDay = cloneObject(balanceCashboxDay)
        date.setDate(date.getDate()+1)
    }
}
