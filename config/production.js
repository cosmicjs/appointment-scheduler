module.exports = {
  bucket: {
    slug: process.env.COSMIC_BUCKET,
    read_key: process.env.COSMIC_READ_KEY,
    write_key: process.env.COSMIC_WRITE_KEY
  },
  twilio: {
    auth: process.env.TWILIO_AUTH,
    sid: process.env.TWILIO_SID,
    number: process.env.TWILIO_NUMBER
  }
}
