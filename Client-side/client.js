// Client-side code
import { decompress } from 'zstd-codec';

// Khởi tạo zstd decoder
const zstd = await initZstd();

socket.on('notification', async (payload) => {
  try {
    const { data, metadata } = payload;
    
    let notificationData;
    if (metadata && metadata.compressed) {
      // Chuyển từ base64 về binary
      const binaryData = atob(data);
      const arrayBuffer = new Uint8Array(binaryData.length);
      for (let i = 0; i < binaryData.length; i++) {
        arrayBuffer[i] = binaryData.charCodeAt(i);
      }
      
      // Giải nén dữ liệu
      const decompressed = zstd.decompress(arrayBuffer);
      
      // Chuyển đổi về định dạng ban đầu
      if (metadata.originalType === 'object') {
        notificationData = JSON.parse(new TextDecoder().decode(decompressed));
      } else {
        notificationData = new TextDecoder().decode(decompressed);
      }
    } else {
      // Dữ liệu không được nén
      notificationData = data;
    }
    
    // Xử lý thông báo như bình thường
    displayNotification(notificationData);
  } catch (error) {
    console.error('Error processing notification:', error);
  }
});