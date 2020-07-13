const http = require('http')
const TBot = require('./KskTelegramBot')
const csv = require('csv-parser')
const fs = require('fs')
const stripBom = require('strip-bom-stream')
const bs = new Map()

http.createServer({}, TBot.listenWebhook).listen(3002)

fs.createReadStream('./brod.csv').pipe(stripBom()).pipe(csv({separator: ';'})).on('data', data => {
    if(data['Номер БС']) bs.set(data['Номер БС'], data)
}).on('end', async ()=>{
    const authList = await new Promise(resolve => {
        let users = []
        fs.createReadStream('./users.csv').pipe(stripBom()).pipe(csv({separator: ';'})).on("data", data => {
            users.push(data['uid'])
        }).on("end", ()=>{
            resolve(users)
        })
    })

    TBot.text(/^.*$/, async m => {
        if(!authList.includes(String(m.chat.id))){
            await TBot.send('sendMessage', {
                chat_id: m.chat.id,
                text: 'Доступ ограничен!\nСообщи свой uid ( ' + m.chat.id + ' ) кому следует чтобы получить доступ,\nи перезапусти бот (очистить историю).'
            })
            await TBot.send('deleteMessage', {
                chat_id: m.chat.id,
                message_id: m.message_id
            })
        }else{
            if(m.match[0] === '/start'){
                await TBot.send('sendMessage', {
                    chat_id: m.chat.id,
                    text: 'Всё отлично, вводи номер БС.\nТак же можно узнать частоту рфника по его маркеровке, введи RF.XXXX'
                })
                await TBot.send('deleteMessage', {
                    chat_id: m.chat.id,
                    message_id: m.message_id
                })
            }else{
                let gps, msg = ''
                const inf = m.match[0]
                if(/^RF\..{4}/.test(inf)){
                    const RF = {
                        FRMA: 800, FRMD: 800, FXCA: '850 180W', FXDA: 900, FXDJ: 900, FXEA: 1800, FXFB: 1900, FRGP: 2100, FRHA: 2600,
                        FRIE: '1700/2100', FXCB: 850, FXDB: 900, FXEB: 1800, FXFC: 1900, FXJB: '900 240W', FRGT: 2100,
                        FRGS: 2100, FRPA: 700, FRPB: 700, FRHC: 2600, FRHF: 2600, FRMC: 800, FXED: '1800 360W', FHCA: 850,
                        FRLB: 730, FHDA: '900 80W', FHEA: 1800, FRGQ: 2100, FRHB: 2600, FRMB: 800, FHEB: 1800, FHEF: '1800 120W',
                        FHDB: 900, FRGY: 2100, FRIG: '1700/2100', FRHD: 2600, FRHE: 2600, FHFB: '1900 160W'
                    }
                    msg = RF[inf.substr(3)]
                }else{
                    const str = bs.get(inf)
                    if(str){
                        for (let i in str){
                            if(str[i].includes('<')) str[i] = str[i].split('<').join(' ')
                            if(str[i].includes('>')) str[i] = str[i].split('>').join(' ')
                            if(str[i]) msg += `<i><b>${i}</b></i>:\n\n${i === 'Координаты' ? '<a href="https://yandex.ru/maps/?text=' + str[i] + '">' + str[i] + '</a>' : str[i]}\n\n------------------------------------------------------------\n`
                        }
                        msg += 'БС: ' + str['Номер БС']
                        gps = str['Координаты']
                    }
                }
                await TBot.send('sendMessage', {
                    chat_id: m.chat.id,
                    parse_mode: 'HTML',
                    disable_web_page_preview: true,
                    text: msg ? msg : 'Информация не найдена, запрос по ней в скором времени будет проверен.'
                })
                if(gps){
                    await TBot.send('sendLocation', {
                        chat_id: m.chat.id,
                        latitude: gps.split(',')[0],
                        longitude: gps.split(',')[1]
                    })
                }
            }
        }
    })

})
