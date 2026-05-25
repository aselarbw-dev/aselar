
import  CryptoJS from "crypto-js";

const SECRET_KEY = "your-very-secure-key"; // Ideally store in `.env` in production

export const encryptData = (data: any): string => {
  const stringifiedData = JSON.stringify(data);
  const encrypted = CryptoJS.AES.encrypt(stringifiedData, SECRET_KEY).toString();
  return encrypted;
};

export const decryptData = (cipherText: string): any => {
  const bytes = CryptoJS.AES.decrypt(cipherText, SECRET_KEY);
  const decrypted = bytes.toString(CryptoJS.enc.Utf8);
  return JSON.parse(decrypted);
};
