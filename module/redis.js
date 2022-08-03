const Redis = require('ioredis');
const { pdHHMM } = require('../module/const')

module.exports.SingletonRedis = class SingletonRedis {
    constructor() {
        if (!!SingletonRedis.instance) {
            return SingletonRedis.instance;
        }
        SingletonRedis.instance = this;
        this.redis = new Redis();
        return this;
    }
    async allowSignIn(login){
        let bruteForce = await this.redis.get(`${login}BruteForce`)
        if(bruteForce){
            bruteForce = JSON.parse(bruteForce)
            let now = new Date()
            if(!bruteForce.date){
                bruteForce.count += 1
                if(bruteForce.count>5) {
                    now.setMinutes(now.getMinutes()+5)
                    bruteForce = JSON.stringify({date: now})
                    await this.redis.set(`${login}BruteForce`, bruteForce)
                    return {allow: true}
                }
                else {
                    bruteForce = JSON.stringify(bruteForce)
                    await this.redis.set(`${login}BruteForce`, bruteForce)
                    return {allow: true}
                }
            }
            else if(now>new Date(bruteForce.date)){
                bruteForce = JSON.stringify({count: 1})
                await this.redis.set(`${login}BruteForce`, bruteForce)
                return {allow: true}
            }
            else {
                bruteForce.date = new Date(bruteForce.date)
                bruteForce.date.setMinutes(bruteForce.date.getMinutes()+1)
                return {allow: false, error: `Повторите попытку в ${pdHHMM(bruteForce.date)}`}
            }
        }
        else {
            bruteForce = JSON.stringify({count: 1})
            await this.redis.set(`${login}BruteForce`, bruteForce)
            return {allow: true}
        }
    }
    async clearSignIn(login){
        await this.redis.set(`${login}BruteForce`, null)
    }
}