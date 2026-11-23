import QRCode from 'qrcode';

export async function generateQrCode(data) {
  if (typeof data !== 'string' || !data.startsWith('otpauth://totp/')) {
    throw new TypeError('URI do autenticador inválida');
  }

  return QRCode.toDataURL(data, {
    errorCorrectionLevel: 'M',
    type: 'image/png',
    margin: 2,
    width: 300
  });
}
