'use strict';

const {get} = require('axios')

class Handler {
  constructor({rekoSvc,translatorSvc}){
    this.rekoSvc = rekoSvc
    this.translatorSvc = translatorSvc
  }

  async detectImageLabels (buffer){
    const result = await this.rekoSvc.detectLabels({
      Image:{
        Bytes:buffer
      }
    }).promise()

    const confidencePercent = result.Labels
    .filter(({Confidence}) => Confidence > 80 )
    
    const names = confidencePercent 
      .map(({Name})=> Name)
      .join(' and ')

      return {names,confidencePercent}

  }

  async translateText(text){
    const params = {
      SourceLanguageCode:'en',
      TargetLanguageCode:'pt',
      Text:text
    }
    const {TranslatedText} = await this.translatorSvc
    .translateText(params)
    .promise()
    return TranslatedText.split(' e')
  }


  async getImageBuffer(imageUrl){
    const response = await get(imageUrl,{
      responseType:'arraybuffer'
    })
    const buffer = Buffer.from(response.data,'base64')
    return buffer
  }

  async formatTextResult(texts,confidencePercent){
    const finalText=[]
    for(const indexText in texts){
      const nameInPortugues = texts[indexText]
      const confidence = confidencePercent[indexText].Confidence

      finalText.push(
        ` ${confidence.toFixed(2) } de ser do tipo ${nameInPortugues}`
      )
    }
    return  finalText.join(' \n ')
  }

  async main(event){
    try{
      const{ imageUrl } = event.queryStringParameters
      console.log("downloading image... ")
      const buffer = await this.getImageBuffer(imageUrl)
      console.log('Detecting labels...')
      const{names,confidencePercent} = await this.detectImageLabels(buffer)
      console.log('Translate to pt...')
      const text = await this.translateText(names)
      console.log('Formatting final text...')
      const finalText = await this.formatTextResult(text,confidencePercent)

      return{
        statusCode:200,
        body:finalText
      }

    }catch(err){
      console.error('Error **',err.stack)
      return{
        statusCode:500,
        body:'INTERNAL SERVER ERROR'
      }
    }
  } 
}
const aws = require('aws-sdk')
const reko = new aws.Rekognition()
const translator = new aws.Translate
const handler = new Handler({
  rekoSvc : reko,
  translatorSvc : translator
})
module.exports.main = handler.main.bind(handler)