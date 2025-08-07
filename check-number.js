const phone = '0818677776';
const digitsOnly = phone.replace(/\D/g, '');
console.log('Phone:', phone);
console.log('Digits only:', digitsOnly);
console.log('Length:', digitsOnly.length);
console.log('Starts with:', digitsOnly.substring(0, 2));
console.log('Is valid 08xxxxxxxx:', digitsOnly.startsWith('08') && digitsOnly.length >= 10 && digitsOnly.length <= 13);
