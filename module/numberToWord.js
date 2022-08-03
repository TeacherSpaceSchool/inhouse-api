const numbers = {
    '*': {
        '1': 'один ',
        '2': 'два ',
        '3': 'три ',
        '4': 'четыре ',
        '5': 'пять ',
        '6': 'шесть ',
        '7': 'семь ',
        '8': 'восемь ',
        '9': 'девять ',
        '0': ''
    },
    '1*': {
        '10': 'десять ',
        '11': 'одиннадцать ',
        '12': 'двенадцать ',
        '13': 'тринадцать ',
        '14': 'четырнадцать ',
        '15': 'пятнадцать ',
        '16': 'шестнадцать ',
        '17': 'семгадцать ',
        '18': 'восемнадцать ',
        '19': 'девятнадцать ',
        '0': ''
    },
    '**': {
        '2': 'двадцать ',
        '3': 'тридцать ',
        '4': 'сорок ',
        '5': 'пятьдесят ',
        '6': 'шестьдесят ',
        '7': 'семьдесят ',
        '8': 'восемьдесят ',
        '9': 'девяносто ',
        '0': ''
    },
    '***': {
        '1': 'сто ',
        '2': 'двести ',
        '3': 'тристо ',
        '4': 'четыреста ',
        '5': 'пятьсот ',
        '6': 'шестьсот ',
        '7': 'семьсот ',
        '8': 'восемьсот ',
        '9': 'девятьсот ',
        '0': ''
    },
}

module.exports = async (number, type) => {
    let intWords = '', floatWords = ''
    number = number.toString()
    number = number.split('.')
    let int = number[0].split('')
    int.reverse()
    for(let i=0; i<int.length; i++) {
        if(i===3&&(int[3]&&int[3]!=='0'||int[4]&&int[4]!=='0'||int[5]&&int[5]!=='0')) {
            if(int[3]==='1'&&int[4]!=='1')
                intWords = 'тысяча ' + intWords
            else if(['2', '3', '4'].includes(int[3]))
                intWords = 'тысячи ' + intWords
            else
                intWords = 'тысяч ' + intWords
        }
        else if(i===6) {
            if(int[3]==='1'&&int[4]!=='1')
                intWords = 'миллион ' + intWords
            else if(['2', '3', '4'].includes(int[3]))
                intWords = 'миллиона ' + intWords
            else
                intWords = 'миллионов ' + intWords
        }
        if(i===0&&int[1]==='1'||i===3&&int[4]==='1'||i===6&&int[7]==='1') {
            intWords = numbers['1*'][int[i+1]+int[i]] + intWords
            i++
        }
        else if(i===0||i===3||i===6) {
            if(i===3&&int[3]==='1')
                intWords = 'одна ' + intWords
            else if(i===3&&int[3]==='2')
                intWords = 'две ' + intWords
            else
                intWords = numbers['*'][int[i]] + intWords
        }
        else if(i===1||i===4||i===7) {
            intWords = numbers['**'][int[i]] + intWords
        }
        else if(i===2||i===3||i===8) {
            intWords = numbers['***'][int[i]] + intWords
        }
    }
    if(number[1]) {
        let float = number[1].split('')
        let lastOne = false
        float.reverse()
        for(let i=0; i<float.length; i++) {
            if(i===3&&(float[3]&&float[3]!=='0'||float[4]&&float[4]!=='0'||float[5]&&float[5]!=='0')) {
                if(float[3]==='1'&&float[4]!=='1')
                    floatWords = 'тысяча ' + floatWords
                else if(['2', '3', '4'].includes(float[3]))
                    floatWords = 'тысячи ' + floatWords
                else
                    floatWords = 'тысяч ' + floatWords
            }
            else if(i===6) {
                if(float[3]==='1'&&float[4]!=='1')
                    floatWords = 'миллион ' + floatWords
                else if(['2', '3', '4'].includes(float[3]))
                    floatWords = 'миллиона ' + floatWords
                else
                    floatWords = 'миллионов ' + floatWords
            }
            if(i===0&&float[1]==='1'||i===3&&float[4]==='1'||i===6&&float[7]==='1') {
                floatWords = numbers['1*'][float[i+1]+float[i]] + floatWords
                i++
            }
            else if(i===0||i===3||i===6) {
                if(i===0&&float[0]==='1') {
                    floatWords = 'одна ' + floatWords
                    lastOne = true
                }
                else if(i===3&&float[3]==='1')
                    floatWords = 'одна ' + floatWords
                else if(i===3&&float[3]==='2')
                    floatWords = 'две ' + floatWords
                else
                    floatWords = numbers['*'][float[i]] + floatWords
            }
            else if(i===1||i===4||i===7) {
                floatWords = numbers['**'][float[i]] + floatWords
            }
            else if(i===2||i===3||i===8) {
                floatWords = numbers['***'][float[i]] + floatWords
            }
        }
        if(float.length===1) {
            floatWords += !lastOne?'десятых':'десятая'
        }
        else if(float.length===2) {
            floatWords += !lastOne?'сотых':'сотая'
        }
        else if(float.length===3) {
            floatWords += !lastOne?'тысячных':'тысячная'
        }
        else if(float.length===4) {
            floatWords += !lastOne?'десятитысячных':'десятитысячная'
        }
        else if(float.length===5) {
            floatWords += !lastOne?'стотысячных':'стотысячная'
        }
        else {
            floatWords += !lastOne?'дробных':'дробная'
        }
    }
    let words = type==='all'?intWords+(floatWords?'целых ':'')+floatWords:type==='float'?floatWords:intWords
    return words.trim()
}
