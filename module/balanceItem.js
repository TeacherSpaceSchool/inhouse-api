const BalanceItem = require('../models/balanceItem');
const Warehouse = require('../models/warehouse');

module.exports.reductionBalanceItem = async () => {
    let findObjects = await BalanceItem.find({store: null});
    console.log(`reductionBalanceItem ${findObjects.length}`);
    for(let i=0; i<findObjects.length; i++) {
        findObjects[i].store = (await Warehouse.findById(findObjects[i].warehouse).lean()).store
        await findObjects[i].save()
    }
}
