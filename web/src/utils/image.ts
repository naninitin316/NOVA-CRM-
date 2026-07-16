const MAX_LOGO_BYTES = 700 * 1024;
const LOGO_MAX_SIZE = 512;

function dataUrlBytes(value: string) {
  const base64 = value.split(',')[1] || '';
  return Math.ceil((base64.length * 3) / 4);
}

export function readLogoFile(file?: File | null) {
  return new Promise<string>((resolve, reject) => {
    if (!file) {
      resolve('');
      return;
    }
    if (!file.type.startsWith('image/')) {
      reject(new Error('Please upload an image file.'));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const original = String(reader.result || '');
      const image = new Image();

      image.onload = () => {
        const scale = Math.min(1, LOGO_MAX_SIZE / Math.max(image.width, image.height));
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');

        if (!context) {
          resolve(original);
          return;
        }

        context.drawImage(image, 0, 0, width, height);

        let quality = 0.88;
        let compressed = canvas.toDataURL('image/webp', quality);
        while (dataUrlBytes(compressed) > MAX_LOGO_BYTES && quality > 0.45) {
          quality -= 0.12;
          compressed = canvas.toDataURL('image/webp', quality);
        }

        if (dataUrlBytes(compressed) > MAX_LOGO_BYTES) {
          reject(new Error('Logo is too large. Please choose a smaller image.'));
          return;
        }

        resolve(compressed);
      };

      image.onerror = () => {
        if (dataUrlBytes(original) > MAX_LOGO_BYTES) {
          reject(new Error('Logo is too large. Please choose a smaller image.'));
          return;
        }
        resolve(original);
      };

      image.src = original;
    };
    reader.onerror = () => reject(new Error('Logo could not be read.'));
    reader.readAsDataURL(file);
  });
}
